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

redis_url = settings.get('cache', 'redis_url')
r = redis.from_url(redis_url)


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
                expiration = settings.get('cache', 'jobs_expiration')
            else:
                expiration = settings.get('cache', 'global_expiration')

            resp = f(*args, **kwargs)
            r.set(cache_key, json.dumps(resp), expiration)
            return resp

        return inner

    return decorator
