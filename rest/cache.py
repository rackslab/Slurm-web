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

try:
    import redis
    redis_available = True
except ImportError:
    redis_available = False

import json
from functools import wraps
from settings import settings
from ConfigParser import NoOptionError, NoSectionError

try:
    if settings.get('config', 'cache') == 'enable':
        if redis_available:
            enabled = True
            redis_host = settings.get('cache', 'redis_host')
        else:
            enabled = False
            print ("Package python-redis unavailable, cache mechanism won't" +
                   "be enabled")
    try:
        redis_port = int(settings.get('cache', 'redis_port'))
    except ValueError as e:
        print "Error while parsing redis_port, check restapi.conf : %s" % str(e)
        redis_port = 6379
    except NoOptionError as e:
        print ("Error while retrieving redis_port parameter, not found," +
               (" check restapi.conf : %s" % str(e)))

    try:
        jobs_expiration = int(settings.get('cache', 'jobs_expiration'))
    except ValueError as e:
        print ("Error while parsing jobs_expiration," +
               (" check restapi.conf : %s" % (str(e))))
        jobs_expiration = 10
    except NoOptionError as e:
        print ("Error while retrieving jobs_expiration parameter, not found," +
               (" check restapi.conf : %s" % str(e)))

    try:
        global_expiration = int(settings.get('cache', 'global_expiration'))
    except ValueError as e:
        print ("Error while parsing global_expiration," +
               (" check restapi.conf : %s" % str(e)))
        global_expiration = 86400
    except NoOptionError as e:
        print ("Error while retrieving global_expiration parameter, not" +
               (" found, check restapi.conf : %s" % str(e)))

    if redis_available:
        r = redis.Redis(redis_host, redis_port)

except NoOptionError as e:
    enabled = False
    print ("Error while retrieving cache parameters, not found," +
           (" check restapi.conf : %s" % str(e)))
except NoSectionError as e:
    enabled = False
    print ("Error while retrieving parameter, section not found," +
           (" check restapi.conf : %s" % str(e)))

def cache():
    def decorator(f):
        @wraps(f)
        def inner(*args, **kwargs):
            if not enabled:
                return f(*args, **kwargs)

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
            if enabled and isinstance(resp, dict):
                try:
                    r.set(cache_key, json.dumps(resp), expiration)
                except:
                    if 'job' not in f.__name__:
                        r.set(cache_key, json.dumps(resp))

            return resp

        return inner

    return decorator
