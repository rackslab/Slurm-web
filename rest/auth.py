#!flask/bin/python
# -*- coding: utf-8 -*-
#
# Copyright (C) 2015 EDF SA
#
# This file is part of slurm-web.
#
# slurm-web is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# slurm-web is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.

import ldap
import json
from flask import request, abort
from settings import settings
from functools import wraps
from werkzeug.exceptions import Forbidden
from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)
import os
import platform

secret_key = settings.get('config', 'secret_key') + platform.node()
enabled = settings.get('config', 'authentication') == 'enable'
filtered_keys_by_role = {
    'all': settings.get('roles', 'resticted_fields_for_all').split(','),
    'user': settings.get('roles', 'resticted_fields_for_user').split(','),
    'admin': settings.get('roles', 'resticted_fields_for_admin').split(',')
}
all_restricted = not(settings.get('roles', 'all') == 'all')
users = settings.get('roles', 'user').split(',')
admins = settings.get('roles', 'admin').split(',')

ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)


def get_ldap_connection():
    conn = ldap.initialize(settings.get('ldap', 'uri'))
    return conn


def filter_dict(to_filter={}, filtered_keys=[]):
    if isinstance(to_filter, dict):
        for key in set(to_filter):
            if key in filtered_keys:
                del to_filter[key]
            else:
                if isinstance(to_filter[key], dict):
                    filter_dict(to_filter[key], filtered_keys)
    if isinstance(to_filter, list):
        for elem in to_filter:
            filter_dict(elem, filtered_keys)


class AuthenticationError(Exception):
    pass


class CORSForbidden(Forbidden):
    def get_headers(self, environ):
        """Prevent CORS error on Forbidden response."""
        return [('Content-Type', 'text/html'),
                ('Access-Control-Allow-Origin', '*')]

abort.mapping.update({403: CORSForbidden})


class User(object):
    def __init__(self, username, password, role):
        self.username = username
        self.password = password
        self.role = role

    # create authenticated user
    @staticmethod
    def user(username, password):
        role = User.get_role_from_ldap(username, password)
        return User(username, password, role)

    # create a guest user
    @staticmethod
    def guest():
        return User('guest', 'guest', 'all')

    @staticmethod
    def get_role_from_ldap(username, password):
        # mock LDAP in development
        if os.environ.get('LDAP_ENV') == 'development':
            print "LDAP authentication mocked"
            if username == 'marie' or username == 'pierre':
                if password == 'secret':
                    groupname = 'chimistes'
                    if username in admins or ("@" + groupname) in admins:
                        return 'admin'
                    if username in users or ("@" + groupname) in users:
                        return 'user'
                    return 'all'
            raise AuthenticationError

        # here deal with ldap to get user role
        conn = get_ldap_connection()

        try:
            # authicate user on ldap
            conn.simple_bind_s(
                'uid=%s,ou=%s,%s' % (
                    username,
                    settings.get('ldap', 'ugroup'),
                    settings.get('ldap', 'base')
                ),
                password
            )

            print "User %s authenticated" % username

            # retrieve user's group id
            results = conn.search_s(
                'uid=%s,ou=%s,%s' % (
                    username,
                    settings.get('ldap', 'ugroup'),
                    settings.get('ldap', 'base')
                ),
                ldap.SCOPE_SUBTREE
            )
            print results
            gidNumber = results[0][1]['gidNumber'][0]

            print "User's group number: %s" % gidNumber

            # retrieve user's group name
            filter = 'gidNumber=%s' % gidNumber
            results = conn.search_s(
                'ou=groups,%s' % settings.get('ldap', 'base'),
                ldap.SCOPE_SUBTREE,
                filter
            )
            print results
            groupname = results[0][1]['cn'][0]

            print "User's group name: %s" % groupname

            if username in admins or ("@" + groupname) in admins:
                return 'admin'
            if username in users or ("@" + groupname) in users:
                return 'user'
            return 'all'

        except ldap.INVALID_CREDENTIALS:
            print "Authentication failed: username or password is incorrect."
            raise AuthenticationError

        finally:
            conn.unbind_s()

    def generate_auth_token(
        self, expiration=int(settings.get('ldap', 'expiration'))
    ):
        s = Serializer(secret_key, expires_in=expiration)
        token = s.dumps({
            'username': self.username,
            'password': self.password,
            'role':     self.role
        })
        print "generate_auth_token : token -> %s" % token
        return token

    @staticmethod
    def verify_auth_token(token):
        s = Serializer(secret_key)
        try:
            data = s.loads(token)
            print "verify_auth_token : data -> %s" % data
        except SignatureExpired:
            print "verify_auth_token : SignatureExpired "
            return None  # valid token, but expired
        except BadSignature:
            print "verify_auth_token : BadSignature "
            return None  # invalid token
        except TypeError:
            print "verify_auth_token : TypeError"
            return None

        if data['role'] == 'all':
            return User.guest()

        user = User.user(data['username'], data['password'])
        return user


def authentication_verify():
    def decorator(f):
        @wraps(f)
        def inner(*args, **kwargs):
            resp = f(*args, **kwargs)
            if not enabled:
                return json.dumps(resp)

            token = json.loads(request.data)['token']

            if token is None:
                return abort(403)

            user = User.verify_auth_token(token)
            if user is not None:
                if user.role == 'all' and all_restricted:
                    print "role 'all' unauthorized"
                    return abort(403)

                filter_dict(resp, filtered_keys_by_role[user.role])
                return json.dumps(resp)

            return abort(403)

        return inner

    return decorator
