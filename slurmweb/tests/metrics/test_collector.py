# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
from unittest import mock
import ipaddress

import prometheus_client
import prometheus_client.core

from slurmweb.metrics.collector import (
    SlurmWebMetricsCollector,
    get_client_ipaddress,
)
from slurmweb.errors import SlurmwebCacheError
from slurmweb.slurmrestd.errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdInternalError,
    SlurmrestdAuthenticationError,
)


class TestSlurmWebMetricsCollectorRegister(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.mock_slurmrestd = mock.MagicMock()
        self.mock_cache = mock.MagicMock()

    def test_register(self):
        """Test the register method."""
        with mock.patch("prometheus_client.REGISTRY") as mock_registry:
            collector = SlurmWebMetricsCollector(
                slurmrestd=self.mock_slurmrestd, cache=self.mock_cache
            )

            # Verify registry.register was called
            mock_registry.register.assert_called_once_with(collector)

            # Verify unregister calls for built-in collectors
            expected_unregister_calls = [
                mock.call(prometheus_client.GC_COLLECTOR),
                mock.call(prometheus_client.PLATFORM_COLLECTOR),
                mock.call(prometheus_client.PROCESS_COLLECTOR),
            ]
            mock_registry.unregister.assert_has_calls(
                expected_unregister_calls, any_order=True
            )

    def test_register_with_keyerror(self):
        """Test register method when unregister raises KeyError."""
        with mock.patch("prometheus_client.REGISTRY") as mock_registry:
            # Make unregister raise KeyError
            mock_registry.unregister.side_effect = KeyError("Collector not found")

            collector = SlurmWebMetricsCollector(
                slurmrestd=self.mock_slurmrestd, cache=self.mock_cache
            )

            # Verify registry.register was called
            mock_registry.register.assert_called_once_with(collector)

            # Verify unregister calls for built-in collectors
            expected_unregister_calls = [
                mock.call(prometheus_client.GC_COLLECTOR),
                mock.call(prometheus_client.PLATFORM_COLLECTOR),
                mock.call(prometheus_client.PROCESS_COLLECTOR),
            ]
            mock_registry.unregister.assert_has_calls(
                expected_unregister_calls, any_order=True
            )

    def test_unregister(self):
        """Test the unregister method."""
        with mock.patch("prometheus_client.REGISTRY") as mock_registry:
            collector = SlurmWebMetricsCollector(
                slurmrestd=self.mock_slurmrestd, cache=self.mock_cache
            )

            collector.unregister()
            mock_registry.unregister.assert_called_with(collector)


class TestSlurmWebMetricsCollector(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.mock_slurmrestd = mock.MagicMock()
        self.mock_cache = mock.MagicMock()

        # Mock the prometheus registry to avoid side effects
        with mock.patch("prometheus_client.REGISTRY"):
            self.collector = SlurmWebMetricsCollector(
                slurmrestd=self.mock_slurmrestd, cache=self.mock_cache
            )
        # Mock slurmrestd responses
        self.mock_slurmrestd.resources_states.return_value = (
            {"idle": 5, "allocated": 3, "down": 1},  # nodes_states
            {"idle": 20, "allocated": 12, "down": 4},  # cores_states
            {"idle": 2, "allocated": 1, "down": 0},  # gpus_states
            9,  # nodes_total
            36,  # cores_total
            3,  # gpus_total
        )
        self.mock_slurmrestd.jobs_states.return_value = (
            {"running": 10, "pending": 5, "completed": 100},  # jobs_states
            115,  # jobs_total
        )

        # Mock cache responses
        self.mock_cache.metrics.return_value = (
            {"nodes": 5, "jobs": 3},  # cache_hits
            {"nodes": 2, "jobs": 1},  # cache_misses
            8,  # total_hits
            3,  # total_misses
        )

    def test_collect_success_with_cache(self):
        """Test successful collection with cache enabled."""

        # Collect metrics
        metrics = list(self.collector.collect())

        # Verify we got the expected number of metrics
        self.assertEqual(len(metrics), 12)  # 8 slurm metrics + 4 cache metrics

        # Verify slurmrestd methods were called
        self.mock_slurmrestd.resources_states.assert_called_once()
        self.mock_slurmrestd.jobs_states.assert_called_once()
        self.mock_cache.metrics.assert_called_once()

    def test_collect_success_without_cache(self):
        """Test successful collection without cache."""

        # Disable cache
        self.collector.cache = None

        # Collect metrics
        metrics = list(self.collector.collect())

        # Verify we got only slurm metrics (no cache metrics)
        self.assertEqual(len(metrics), 8)

        # Verify slurmrestd methods were called
        self.mock_slurmrestd.resources_states.assert_called_once()
        self.mock_slurmrestd.jobs_states.assert_called_once()

    def test_collect_slurmrestd_not_found_error(self):
        """Test collection with SlurmrestdNotFoundError."""
        self.mock_slurmrestd.resources_states.side_effect = SlurmrestdNotFoundError(
            "Not found"
        )

        with self.assertLogs("slurmweb.metrics.collector", level="ERROR") as cm:
            metrics = list(self.collector.collect())

            # Should return empty list and log error
            self.assertEqual(metrics, [])
            self.assertIn(
                "Unable to collect metrics due to URL not found on slurmrestd: "
                "Not found",
                cm.output[0],
            )

    def test_collect_slurmrestd_invalid_response_error(self):
        """Test collection with SlurmrestdInvalidResponseError."""
        self.mock_slurmrestd.resources_states.side_effect = (
            SlurmrestdInvalidResponseError("Invalid response")
        )

        with self.assertLogs("slurmweb.metrics.collector", level="ERROR") as cm:
            metrics = list(self.collector.collect())

            # Should return empty list and log error
            self.assertEqual(metrics, [])
            self.assertIn(
                "Unable to collect metrics due to slurmrestd invalid response: "
                "Invalid response",
                cm.output[0],
            )

    def test_collect_slurmrestd_connection_error(self):
        """Test collection with SlurmrestConnectionError."""
        self.mock_slurmrestd.resources_states.side_effect = SlurmrestConnectionError(
            "Connection failed"
        )

        with self.assertLogs("slurmweb.metrics.collector", level="ERROR") as cm:
            metrics = list(self.collector.collect())

            # Should return empty list and log error
            self.assertEqual(metrics, [])
            self.assertIn(
                "Unable to collect metrics due to slurmrestd connection error: "
                "Connection failed",
                cm.output[0],
            )

    def test_collect_slurmrestd_internal_error(self):
        """Test collection with SlurmrestdInternalError."""
        error = SlurmrestdInternalError(
            "Internal error", "error_code", "Error description", "source"
        )
        self.mock_slurmrestd.resources_states.side_effect = error

        with self.assertLogs("slurmweb.metrics.collector", level="ERROR") as cm:
            metrics = list(self.collector.collect())

            # Should return empty list and log error
            self.assertEqual(metrics, [])
            self.assertIn(
                "Unable to collect metrics due to slurmrestd internal error: "
                "Error description (source)",
                cm.output[0],
            )

    def test_collect_slurmrestd_authentication_error(self):
        """Test collection with SlurmrestdAuthenticationError."""
        self.mock_slurmrestd.resources_states.side_effect = (
            SlurmrestdAuthenticationError("Auth failed")
        )

        with self.assertLogs("slurmweb.metrics.collector", level="ERROR") as cm:
            metrics = list(self.collector.collect())

            # Should return empty list and log error
            self.assertEqual(metrics, [])
            self.assertIn(
                "Unable to collect metrics due to slurmrestd authentication error: "
                "Auth failed",
                cm.output[0],
            )

    def test_collect_cache_error(self):
        """Test collection with SlurmwebCacheError."""
        self.mock_slurmrestd.resources_states.side_effect = SlurmwebCacheError(
            "Cache error"
        )

        with self.assertLogs("slurmweb.metrics.collector", level="ERROR") as cm:
            metrics = list(self.collector.collect())

            # Should return empty list and log error
            self.assertEqual(metrics, [])
            self.assertIn(
                "Unable to collect metrics due to cache error: Cache error",
                cm.output[0],
            )


class TestGetClientIpaddress(unittest.TestCase):
    def test_get_client_ipaddress_with_x_forwarded_for(self):
        """Test getting client IP from X-Forwarded-For header."""
        environ = {
            "HTTP_X_FORWARDED_FOR": "192.168.1.100, 10.0.0.1, 172.16.0.1",
            "REMOTE_ADDR": "127.0.0.1",
        }

        ip = get_client_ipaddress(environ)
        self.assertEqual(ip, ipaddress.ip_address("192.168.1.100"))

    def test_get_client_ipaddress_with_x_forwarded_for_whitespace(self):
        """Test getting client IP from X-Forwarded-For header with whitespace."""
        environ = {
            "HTTP_X_FORWARDED_FOR": "  192.168.1.100  , 10.0.0.1  ",
            "REMOTE_ADDR": "127.0.0.1",
        }

        ip = get_client_ipaddress(environ)
        self.assertEqual(ip, ipaddress.ip_address("192.168.1.100"))

    def test_get_client_ipaddress_without_x_forwarded_for(self):
        """
        Test getting client IP from REMOTE_ADDR when X-Forwarded-For is not present.
        """
        environ = {"REMOTE_ADDR": "192.168.1.50"}

        ip = get_client_ipaddress(environ)
        self.assertEqual(ip, ipaddress.ip_address("192.168.1.50"))

    def test_get_client_ipaddress_ipv6(self):
        """Test getting IPv6 client IP."""
        environ = {"HTTP_X_FORWARDED_FOR": "2001:db8::1", "REMOTE_ADDR": "127.0.0.1"}

        ip = get_client_ipaddress(environ)
        self.assertEqual(ip, ipaddress.ip_address("2001:db8::1"))
