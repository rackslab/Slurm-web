from flask import request, abort, jsonify
from settings import settings
from functools import wraps

# for authentication
from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)

secret_key = settings.get('config', 'secret_key')

filtered_keys_by_role = {
    'all': ['command'],
    'user': ['command'],
    'admin': []
}
unauthorized_roles = ['all']


def filter_dict(to_filter={}, filtered_keys=[]):
    for key in set(to_filter):
        if key in filtered_keys:
            del to_filter[key]
        else:
            if isinstance(to_filter[key], dict):
                filter_dict(to_filter[key], filtered_keys)


class User(object):
    def __init__(self, username, password):
        self.username = username
        self.password = password
        # here deal with ldap to get user role
        self.role = 'admin'

    def generate_auth_token(self, expiration=600):
        s = Serializer(secret_key, expires_in=expiration)
        token = s.dumps({'username': self.username,
                         'password': self.password})
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
        user = User(data['username'], data['password'])
        return user


def authentication_verify():
    def decorator(f):
        @wraps(f)
        def inner(*args, **kwargs):
            token = request.json['token']
            user = User.verify_auth_token(token)
            if user is not None:
                if user.role not in (set(filtered_keys_by_role) -
                                     set(unauthorized_roles)):
                    return abort(403)

                resp = f(*args, **kwargs)
                filter_dict(resp, filtered_keys_by_role[user.role])
                return jsonify(resp)

            return abort(403)

        return inner

    return decorator
