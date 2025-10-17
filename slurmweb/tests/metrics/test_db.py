# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
from unittest import mock
import urllib

import aiohttp

from slurmweb.metrics.db import SlurmwebMetricsDB
from slurmweb.errors import SlurmwebMetricsDBError

from ..lib.utils import mock_prometheus_response


class TestSlurmwebMetricsDB(unittest.TestCase):
    def setUp(self):
        self.db = SlurmwebMetricsDB(
            urllib.parse.urlparse("http://localhost:9090"), "slurm"
        )

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_request(self, mock_get):
        _, mock_get.return_value = mock_prometheus_response("nodes-hour")
        self.db.request("nodes", "hour")

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_request_empty_result(self, mock_get):
        _, mock_get.return_value = mock_prometheus_response("unknown-metric")
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Empty result for query .*$"
        ):
            self.db.request("nodes", "hour")

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_request_unknown_path(self, mock_get):
        _, mock_get.return_value = mock_prometheus_response("unknown-path")
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError,
            "^Unexpected response status 400 for metrics database request .*$",
        ):
            self.db.request("nodes", "hour")

    def test_request_unsupported_range(self):
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Unsupported metric range fail$"
        ):
            self.db.request("nodes", "fail")

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_request_connection_error(self, mock_get):
        mock_get.side_effect = aiohttp.client_exceptions.ClientConnectionError(
            "fake connection error"
        )
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError,
            "^Metrics database connection error: fake connection error$",
        ):
            self.db.request("nodes", "hour")
