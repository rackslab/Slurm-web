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
from flask import request, abort, jsonify
from settings import settings
from functools import wraps
from werkzeug.exceptions import Forbidden
from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)
from ConfigParser import NoSectionError, NoOptionError
import os
import platform


guests_allowed = False
all_enabled = True
auth_enabled = settings.get('config', 'authentication') == 'enable'

if auth_enabled:

    if settings.has_option('config', 'secret_key'):
        secret_key_file = settings.get('config', 'secret_key')
    else:
        secret_key_file = '/etc/slurm-web/secret.key'

    # check secret key file exist or print error otherwise
    if not os.path.exists(secret_key_file):
        print "Secret key file %s does not exists" % (secret_key_file)

    try:
        secret_key = open(secret_key_file, 'rb').read()
    except IOError:
        print "IO error with secret key file %s" % (secret_key_file)
        # fallback to bad secret key
        secret_key = b"badsecretkey"

    secret_key += platform.node()

    if settings.has_option('roles', 'guests'):
        guests_allowed_s = settings.get('roles', 'guests')
        if guests_allowed_s == 'enabled':
            guests_allowed = True
        elif not guests_allowed_s == 'disabled':
            print("invalid value '%s' for guests parameter, guests will be "
                  "disabled." % (guests_allowed_s))

    filtered_keys_by_role = {
        'all': settings.get('roles', 'restricted_fields_for_all').split(','),
        'user': settings.get('roles', 'restricted_fields_for_user').split(','),
        'admin': settings.get('roles', 'restricted_fields_for_admin')
        .split(',')
    }

    if settings.has_option('roles', 'all'):
        all_s = settings.get('roles', 'all')
        if all_s == 'disabled':
            all_enabled = False
        elif not all_s == 'enabled':
            print("invalid value '%s' for all parameters, all role will be "
                  "enabled." % (all_s))

    users = settings.get('roles', 'user').split(',')
    admins = settings.get('roles', 'admin').split(',')


# retrieve ACLs for views if exist in configuration
try:
    acl = settings.items('acl')
except NoSectionError:
    acl = []


def get_ldap_connection():

    uri = settings.get('ldap', 'uri')
    conn = ldap.initialize(uri)

    # LDAP/SSL setup
    if uri.startswith('ldaps'):

        conn.protocol_version = ldap.VERSION3
        # Force cert validation
        conn.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_DEMAND)
        if settings.has_option('ldap', 'cacert'):
            cacert = settings.get('ldap', 'cacert')
            # Set path name of file containing all trusted CA certificates
            conn.set_option(ldap.OPT_X_TLS_CACERTFILE, cacert)
        # Force libldap to create a new SSL context
        conn.set_option(ldap.OPT_X_TLS_NEWCTX, 0)

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


class AllUnauthorizedError(Exception):
    pass


class CORSForbidden(Forbidden):
    def get_headers(self, environ):
        """Prevent CORS error on Forbidden response."""
        return [('Content-Type', 'text/html'),
                ('Access-Control-Allow-Origin', '*')]

abort.mapping.update({403: CORSForbidden})


class User(object):
    def __init__(self, username, password, role, groups=None):
        self.username = username
        self.password = password
        self.role = role
        self.groups = groups

    # create authenticated user
    @staticmethod
    def user(username, password):
        groups = User.get_groups_from_ldap(username, password)
        role = User.get_role(username, groups)
        if role == 'all' and not all_enabled:
            raise AllUnauthorizedError
        return User(username, password, role, groups)

    # create a guest user
    @staticmethod
    def guest():
        if not guests_allowed:
            raise AuthenticationError
        if not all_enabled:
            raise AllUnauthorizedError
        return User('guest', 'guest', 'all')

    @staticmethod
    def get_groups_from_ldap(username, password):

        # here deal with ldap to get user groups
        conn = get_ldap_connection()

        try:
            base_people = settings.get('ldap', 'base_people')
            base_group = settings.get('ldap', 'base_group')

            # authenticate user on ldap
            user_dn = "uid=%s,%s" % (username, base_people)
            conn.simple_bind_s(user_dn, password)

            print "User %s authenticated" % username

            # search for user's groups
            look_filter = "(|(&(objectClass=*)(member=%s)))" % (user_dn)
            results = conn.search_s(base_group,
                                    ldap.SCOPE_SUBTREE,
                                    look_filter, ['cn'])
            groups = [result[1]['cn'][0] for result in results]
            return groups

        except ldap.INVALID_CREDENTIALS:
            print "Authentication failed: username or password is incorrect."
            raise AuthenticationError

        except ldap.NO_SUCH_OBJECT as e:
            print "No result found: %s " + str(e)
            raise AuthenticationError

        finally:
            conn.unbind_s()

    @staticmethod
    def get_role(username, groups):
        if username in admins:
            return 'admin'
        for group in groups:
            if ("@" + group) in admins:
                return 'admin'
        if username in users:
            return 'user'
        for group in groups:
            if ("@" + group) in users:
                return 'user'
        return 'all'

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
            print "verify_auth_token : data -> username: %s role: %s" \
                  % (data['username'], data['role'])
        except SignatureExpired:
            print "verify_auth_token : SignatureExpired "
            return None  # valid token, but expired
        except BadSignature:
            print "verify_auth_token : BadSignature "
            return None  # invalid token
        except TypeError:
            print "verify_auth_token : TypeError"
            return None

        if data['username'] == 'guest':
            return User.guest()

        user = User.user(data['username'], data['password'])

        return user

    def restricted_views(self):

        views = set([xacl[0] for xacl in acl])

        for xacl in acl:
            view = xacl[0]
            members = xacl[1].split(',')
            for member in members:
                if member and member[0] == '@' and self.groups is not None \
                   and member[1:] in self.groups:
                    views.remove(view)
                elif member == self.username:
                    views.remove(view)
        return list(views)


def authentication_verify():
    def decorator(f):
        @wraps(f)
        def inner(*args, **kwargs):
            resp = f(*args, **kwargs)
            if not auth_enabled:
                return jsonify(resp)

            token = json.loads(request.data)['token']

            if token is None:
                return abort(403, "No valid token provided")

            try:
                user = User.verify_auth_token(token)
            except AuthenticationError:
                return abort(403, "authentication failed")
            except AllUnauthorizedError:
                return abort(403, "access forbidden to role all")

            if user is None:
                return abort(403, "authentication failed")

            filter_dict(resp, filtered_keys_by_role[user.role])
            return jsonify(resp)

        return inner

    return decorator
