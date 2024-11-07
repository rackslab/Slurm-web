# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
import urllib

import requests

from slurmweb.metrics.db import SlurmwebMetricsDB
from slurmweb.errors import SlurmwebMetricsDBError

from ..utils import mock_prometheus_response


class TestSlurmwebMetricsDB(unittest.TestCase):

    def setUp(self):
        self.db = SlurmwebMetricsDB(
            urllib.parse.urlparse("http://localhost:9090"), "slurm"
        )

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request(self, mock_requests_get):
        mock_requests_get.return_value = mock_prometheus_response("nodes-hour")
        self.db.request("nodes", "hour")

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_empty_result(self, mock_requests_get):
        mock_requests_get.return_value = mock_prometheus_response("unknown-metric")
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Empty result for query .*$"
        ):
            self.db.request("nodes", "hour")

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_unknown_path(self, mock_requests_get):
        mock_requests_get.return_value = mock_prometheus_response("unknown-path")
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Prometheus error for query .*$"
        ):
            self.db.request("nodes", "hour")

    def test_request_unsupported_range(self):
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Unsupported metric range fail$"
        ):
            self.db.request("nodes", "fail")

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_connection_error(self, mock_requests_get):
        mock_requests_get.side_effect = requests.exceptions.ConnectionError("fail")
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Connection error on http://localhost:9090: fail$"
        ):
            self.db.request("nodes", "hour")
