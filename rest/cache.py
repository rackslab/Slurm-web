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
#
#
# Decorator for cache mechanism

import redis
import json
from functools import wraps
from settings import settings

redis_host = settings.get('cache', 'redis_host')
try:
    redis_port = int(settings.get('cache', 'redis_port'))
except ValueError as e:
    print "Error while parsing redis_port, check restapi.conf : %s" % str(e)
    redis_port = 6379
try:
    jobs_expiration = int(settings.get('cache', 'jobs_expiration'))
except ValueError as e:
    print ("Error while parsing jobs_expiration," +
           (" check restapi.conf : %s" % (str(e))))
    jobs_expiration = 10
try:
    global_expiration = int(settings.get('cache', 'global_expiration'))
except ValueError as e:
    print ("Error while parsing global_expiration," +
           (" check restapi.conf : %s" % str(e)))
    global_expiration = 86400

r = redis.Redis(redis_host, redis_port)


def cache():
    def decorator(f):
        @wraps(f)
        def inner(*args, **kwargs):
            cache_key = "%s-%s" % (
                f.__name__,
                ''.join("%s-%r" % (key, val) for (key,
                                                  val) in kwargs.iteritems())
                )

            if r.exists(cache_key):
                print "get %s from cache" % cache_key
                return json.loads(r.get(cache_key))

            if 'job' in f.__name__:
                expiration = jobs_expiration
            else:
                expiration = global_expiration

            resp = f(*args, **kwargs)
            if isinstance(resp, dict):
                r.set(cache_key, json.dumps(resp), expiration)
            return resp

        return inner

    return decorator
