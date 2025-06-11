# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
import pickle

import redis

from slurmweb.cache import CachingService, CacheKey
from slurmweb.errors import SlurmwebCacheError


class TestCachingService(unittest.TestCase):
    def setUp(self):
        self.cache = CachingService("localhost", -1, None)

    def test_get(self):
        data = {"fake": "value"}
        self.cache.connection.get = mock.Mock(return_value=pickle.dumps(data))
        result = self.cache.get(CacheKey("whetever"))
        self.assertEqual(result, data)

    def test_get_not_in_cache(self):
        self.cache.connection.get = mock.Mock(return_value=None)
        result = self.cache.get(CacheKey("whetever"))
        self.assertIsNone(result)

    def test_get_connection_error(self):
        self.cache.connection.get = mock.Mock(
            side_effect=redis.exceptions.ConnectionError
        )
        with self.assertRaises(SlurmwebCacheError):
            self.cache.get(CacheKey("whetever"))

    def test_get_response_error(self):
        self.cache.connection.get = mock.Mock(
            side_effect=redis.exceptions.ResponseError
        )
        with self.assertRaises(SlurmwebCacheError):
            self.cache.get(CacheKey("whetever"))

    def test_put(self):
        data = {"fake": "value"}
        self.cache.connection.set = mock.Mock()
        self.cache.put(CacheKey("whetever"), data, 10)
        self.cache.connection.set.assert_called_once_with(
            "whetever", pickle.dumps(data), ex=10
        )

    def test_put_connection_error(self):
        self.cache.connection.set = mock.Mock(
            side_effect=redis.exceptions.ConnectionError
        )
        with self.assertRaises(SlurmwebCacheError):
            self.cache.put(CacheKey("whetever"), "value", 10)

    def test_put_response_error(self):
        self.cache.connection.set = mock.Mock(
            side_effect=redis.exceptions.ResponseError
        )
        with self.assertRaises(SlurmwebCacheError):
            self.cache.put(CacheKey("whetever"), "value", 10)
