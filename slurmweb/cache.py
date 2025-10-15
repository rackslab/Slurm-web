# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t
import logging

import redis
import pickle

from .errors import SlurmwebCacheError

logger = logging.getLogger(__name__)


class CacheKey:
    def __init__(self, main: str, count: t.Optional[str] = None):
        self.main = main
        if count:
            self.count = count
        else:
            self.count = main

    def __eq__(self, other):
        return self.main == other.main and self.count == other.count


class CachingService:
    KEY_PREFIX_MISS = "cache-miss-"
    KEY_PREFIX_HIT = "cache-hit-"

    def __init__(self, host: str, port: int, password: t.Union[str, None]):
        self.host = host
        self.port = port
        self.connection = redis.Redis(host=host, port=port, password=password)

    def put(self, key: CacheKey, value: t.Any, expiration: int):
        try:
            self.connection.set(key.main, pickle.dumps(value), ex=expiration)
        except (
            redis.exceptions.ConnectionError,
            redis.exceptions.ResponseError,
        ) as err:
            raise SlurmwebCacheError(str(err)) from err

    def get(self, key: CacheKey):
        try:
            value = self.connection.get(key.main)
            if value is not None:
                value = pickle.loads(value)
            return value
        except (
            redis.exceptions.ConnectionError,
            redis.exceptions.ResponseError,
        ) as err:
            raise SlurmwebCacheError(str(err)) from err

    def count_miss(self, key: CacheKey):
        self.connection.sadd("cache-miss-keys", key.count)
        _key = f"{self.KEY_PREFIX_MISS}{key.count}"
        self.connection.incr(_key)
        self.connection.incr("cache-miss-total")

    def count_hit(self, key: CacheKey):
        self.connection.sadd("cache-hit-keys", key.count)
        _key = f"{self.KEY_PREFIX_HIT}{key.count}"
        self.connection.incr(_key)
        self.connection.incr("cache-hit-total")

    def metrics(self):
        cache_misses = {}
        cache_hits = {}
        for _key in self.connection.smembers("cache-miss-keys"):
            _key = _key.decode()
            full_key = f"{self.KEY_PREFIX_MISS}{_key}"
            value = self.connection.get(full_key)
            if not value:
                logger.warning("Miss cache key %s referenced without value", full_key)
                continue
            cache_misses[_key] = int(value)
        for _key in self.connection.smembers("cache-hit-keys"):
            _key = _key.decode()
            full_key = f"{self.KEY_PREFIX_HIT}{_key}"
            value = self.connection.get(full_key)
            if not value:
                logger.warning("Hit cache key %s referenced without value", full_key)
                continue
            cache_hits[_key] = int(value)

        return (
            cache_hits,
            cache_misses,
            int(self.connection.get("cache-hit-total") or 0),
            int(self.connection.get("cache-miss-total") or 0),
        )

    def reset(self):
        """Reset cache statistics."""

        # Reset hit and miss totals
        self.connection.set("cache-hit-total", 0)
        self.connection.set("cache-miss-total", 0)

        # Delete all hit keys
        for _key in self.connection.smembers("cache-hit-keys"):
            _key = _key.decode()
            self.connection.delete(f"{self.KEY_PREFIX_HIT}{_key}")

        # Delete all miss keys
        for _key in self.connection.smembers("cache-miss-keys"):
            _key = _key.decode()
            self.connection.delete(f"{self.KEY_PREFIX_MISS}{_key}")

        # Delete hit and miss keys sets
        self.connection.delete("cache-hit-keys")
        self.connection.delete("cache-miss-keys")
