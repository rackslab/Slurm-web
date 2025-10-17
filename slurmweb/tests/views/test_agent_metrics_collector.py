# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT


from unittest import mock
import ipaddress

from prometheus_client.parser import text_string_to_metric_families

from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestdInternalError,
)
from slurmweb.errors import SlurmwebCacheError
from slurmweb.cache import CachingService
from ..lib.agent import TestAgentBase
from ..lib.utils import all_slurm_versions


class TestAgentMetricsCollector(TestAgentBase):
    def setUp(self):
        self.setup_client(metrics=True)

    def tearDown(self):
        self.app.metrics_collector.unregister()

    @all_slurm_versions
    def test_request_metrics(self, slurm_version):
        [nodes_asset, jobs_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            [("slurm-nodes", "nodes"), ("slurm-jobs", "jobs")],
        )
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        families = list(text_string_to_metric_families(response.text))
        # Check expected metrics are present
        metrics_names = [family.name for family in families]
        self.assertCountEqual(
            [
                "slurm_nodes",
                "slurm_nodes_total",
                "slurm_cores",
                "slurm_cores_total",
                "slurm_gpus",
                "slurm_gpus_total",
                "slurm_jobs",
                "slurm_jobs_total",
            ],
            metrics_names,
        )
        # Check some values against assets
        for family in families:
            if family.name == "slurm_nodes_total":
                self.assertEqual(family.samples[0].value, len(nodes_asset))
            if family.name == "slurm_jobs_total":
                self.assertEqual(family.samples[0].value, len(jobs_asset))

    @all_slurm_versions
    def test_request_metrics_with_cache(self, slurm_version):
        [nodes_asset, jobs_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            [("slurm-nodes", "nodes"), ("slurm-jobs", "jobs")],
        )
        self.app.metrics_collector.cache = mock.Mock(spec=CachingService)
        self.app.metrics_collector.cache.metrics.return_value = (
            {"jobs": 10, "nodes": 5},
            {"jobs": 8, "nodes": 3},
            15,
            11,
        )
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        families = list(text_string_to_metric_families(response.text))
        # Check expected metrics are present
        metrics_names = [family.name for family in families]
        self.assertCountEqual(
            [
                "slurm_nodes",
                "slurm_nodes_total",
                "slurm_cores",
                "slurm_cores_total",
                "slurm_gpus",
                "slurm_gpus_total",
                "slurm_jobs",
                "slurm_jobs_total",
                "slurmweb_cache_hit",
                "slurmweb_cache_miss",
                "slurmweb_cache_hit_total",
                "slurmweb_cache_miss_total",
            ],
            metrics_names,
        )
        # Check some values against assets
        for family in families:
            if family.name == "slurmweb_cache_hit_total":
                self.assertEqual(family.samples[0].value, 15)
            if family.name == "slurmweb_cache_miss_total":
                self.assertEqual(family.samples[0].value, 11)

    def test_request_metrics_forbidden(self):
        # Change restricted list of network allowed to request metrics
        self.app.settings.metrics.restrict = [ipaddress.ip_network("192.168.1.0/24")]
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            response = self.client.get("/metrics")

        # Check HTTP/403 is returned with text message. Also check warning message is
        # emitted in logs.
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.text, "IP address 127.0.0.1 not authorized to request metrics\n"
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.metrics.collector:IP address 127.0.0.1 not "
                "authorized to request metrics"
            ],
        )

    def test_request_metrics_slurmrest_connection_error(self):
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestConnectionError("connection error")
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            response = self.client.get("/metrics")
        # In case of connection error with slurmrestd, metrics WSGI application returns
        # HTTP/200 empty response. Check error message is emitted in logs.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.metrics.collector:Unable to collect metrics due to "
                "slurmrestd connection error: connection error"
            ],
        )

    def test_request_metrics_slurmrestd_invalid_type(self):
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdInvalidResponseError("invalid type")
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            response = self.client.get("/metrics")
        # In case of invalid response from slurmrestd, metrics WSGI application returns
        # HTTP/200 empty response. Check error message is emitted in logs.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.metrics.collector:Unable to collect metrics due to "
                "slurmrestd invalid response: invalid type"
            ],
        )

    def test_request_metrics_slurmrestd_internal_error(self):
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdInternalError(
                "slurmrestd fake error",
                -1,
                "fake error description",
                "fake error source",
            )
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            response = self.client.get("/metrics")
        # In case of slurmrestd internal error, metrics WSGI application returns
        # HTTP/200 empty response. Check error message is emitted in logs.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.metrics.collector:Unable to collect metrics due to "
                "slurmrestd internal error: fake error description (fake error source)"
            ],
        )

    @all_slurm_versions
    def test_request_metrics_slurmrestd_not_found(self, slurm_version):
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdNotFoundError("/unfound")
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            response = self.client.get("/metrics")
        # In case of slurmrestd not found error, metrics WSGI application returns
        # HTTP/200 empty response. Check error message is emitted in logs.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.metrics.collector:Unable to collect metrics due to URL "
                "not found on slurmrestd: /unfound"
            ],
        )

    @all_slurm_versions
    def test_request_metrics_cache_error(self, slurm_version):
        # Collector first calls slurmrestd.nodes() then trigger SlurmwebCacheError on
        # this method call.
        self.app.slurmrestd.nodes = mock.Mock(
            side_effect=SlurmwebCacheError("fake error")
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            response = self.client.get("/metrics")
        # In case of cache error, metrics WSGI application returns HTTP/200 empty
        # response. Check error message is emitted in logs.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.metrics.collector:Unable to collect metrics due to "
                "cache error: fake error"
            ],
        )
