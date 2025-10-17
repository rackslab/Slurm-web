# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

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

    def test_count_miss(self):
        self.cache.connection.sadd = mock.Mock()
        self.cache.connection.incr = mock.Mock()

        key = CacheKey("test-key", "test-count")
        self.cache.count_miss(key)

        # Verify that sadd is called to add the key to the set
        self.cache.connection.sadd.assert_called_once_with(
            "cache-miss-keys", "test-count"
        )

        # Verify that incr is called twice: for the specific key and the total
        expected_calls = [
            mock.call("cache-miss-test-count"),
            mock.call("cache-miss-total"),
        ]
        self.cache.connection.incr.assert_has_calls(expected_calls)

    def test_count_hit(self):
        self.cache.connection.sadd = mock.Mock()
        self.cache.connection.incr = mock.Mock()

        key = CacheKey("test-key", "test-count")
        self.cache.count_hit(key)

        # Verify that sadd is called to add the key to the set
        self.cache.connection.sadd.assert_called_once_with(
            "cache-hit-keys", "test-count"
        )

        # Verify that incr is called twice: for the specific key and the total
        expected_calls = [
            mock.call("cache-hit-test-count"),
            mock.call("cache-hit-total"),
        ]
        self.cache.connection.incr.assert_has_calls(expected_calls)

    def test_metrics_empty(self):
        # Mock for empty sets and null values
        self.cache.connection.smembers = mock.Mock(return_value=set())
        self.cache.connection.get = mock.Mock(return_value=None)

        result = self.cache.metrics()

        # Verify the returned tuple: (cache_hits, cache_misses, hit_total, miss_total)
        self.assertEqual(result, ({}, {}, 0, 0))

    def test_metrics_with_data(self):
        # Mock for sets with keys
        self.cache.connection.smembers = mock.Mock(
            side_effect=[
                {b"key1", b"key2"},  # cache-miss-keys
                {b"key1", b"key3"},  # cache-hit-keys
            ]
        )

        # Mock for counter values
        def mock_get(key):
            if key == "cache-miss-key1":
                return b"5"
            elif key == "cache-miss-key2":
                return b"3"
            elif key == "cache-hit-key1":
                return b"10"
            elif key == "cache-hit-key3":
                return b"7"
            elif key == "cache-hit-total":
                return b"17"
            elif key == "cache-miss-total":
                return b"8"
            else:
                return None

        self.cache.connection.get = mock.Mock(side_effect=mock_get)

        result = self.cache.metrics()

        # Verify the returned tuple
        self.assertEqual(
            result, ({"key1": 10, "key3": 7}, {"key1": 5, "key2": 3}, 17, 8)
        )

    def test_metrics_with_missing_values(self):
        # Mock for sets with keys
        self.cache.connection.smembers = mock.Mock(
            side_effect=[
                {b"key1", b"key2"},  # cache-miss-keys
                {b"key1", b"key3"},  # cache-hit-keys
            ]
        )

        # Mock for counter values - key2 and key3 have no value
        def mock_get(key):
            if key == "cache-miss-key1":
                return b"5"
            elif key == "cache-hit-key1":
                return b"10"
            elif key == "cache-hit-total":
                return b"10"
            elif key == "cache-miss-total":
                return b"5"
            else:
                return None

        self.cache.connection.get = mock.Mock(side_effect=mock_get)

        # Verify that warnings are logged for missing keys and check the result
        with self.assertLogs("slurmweb.cache", level="WARNING") as cm:
            result = self.cache.metrics()

        # Verify the warning messages
        self.assertIn(
            "WARNING:slurmweb.cache:Miss cache key cache-miss-key2 referenced without "
            "value",
            cm.output,
        )
        self.assertIn(
            "WARNING:slurmweb.cache:Hit cache key cache-hit-key3 referenced without "
            "value",
            cm.output,
        )

        # Verify the returned tuple (without missing keys)
        self.assertEqual(result, ({"key1": 10}, {"key1": 5}, 10, 5))

    def test_reset(self):
        # Setup mocks for Redis operations used in reset()
        self.cache.connection.set = mock.Mock()
        # Mock fake cache keys for hit and miss
        self.cache.connection.smembers = mock.Mock(
            side_effect=[{b"hit1", b"hit2"}, {b"miss1"}]
        )
        self.cache.connection.delete = mock.Mock()

        # Call reset()
        self.cache.reset()

        # Check that totals are reset to 0
        self.cache.connection.set.assert_has_calls(
            [mock.call("cache-hit-total", 0), mock.call("cache-miss-total", 0)]
        )

        # Check that per-key counters are deleted for all hit keys
        self.cache.connection.delete.assert_has_calls(
            [
                mock.call("cache-hit-hit1"),
                mock.call("cache-hit-hit2"),
            ],
            any_order=True,
        )

        # Check that per-key counters are deleted for all miss keys
        self.cache.connection.delete.assert_has_calls(
            [mock.call("cache-miss-miss1")], any_order=True
        )

        # Check that sets are cleared
        self.cache.connection.delete.assert_has_calls(
            [mock.call("cache-hit-keys"), mock.call("cache-miss-keys")]
        )
