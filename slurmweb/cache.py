# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t

import redis
import pickle

from .errors import SlurmwebCacheError


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
