# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
from unittest import mock
import urllib.parse
import types

from slurmweb.metrics.db import SlurmwebMetricsDB
from slurmweb.metrics.jobs import (
    JOB_METRICS,
    SlurmwebJobMetrics,
    SlurmwebJobMetricsExporter,
    SlurmwebJobMetricsExporterCEEMS,
    build_exporters,
)
from slurmweb.errors import SlurmwebConfigurationError, SlurmwebMetricsDBError

from ..lib.utils import mock_prometheus_response


def series(values):
    return [{"metric": {}, "values": values}]


class TestJobMetricsExporterCEEMS(unittest.TestCase):
    def setUp(self):
        self.exporter = SlurmwebJobMetricsExporterCEEMS("ceems")

    def test_provides(self):
        self.assertEqual(self.exporter.provides, JOB_METRICS)

    def test_promql_cpu(self):
        self.assertEqual(
            self.exporter.promql("cpu", 42, 60),
            'sum(rate(ceems_compute_unit_cpu_user_seconds_total{uuid="42",'
            'manager="slurm",job="ceems"}[60s]) + '
            'rate(ceems_compute_unit_cpu_system_seconds_total{uuid="42",'
            'manager="slurm",job="ceems"}[60s])) / '
            'sum(ceems_compute_unit_cpus{uuid="42",manager="slurm",job="ceems"}) '
            "* 100",
        )

    def test_promql_memory(self):
        self.assertEqual(
            self.exporter.promql("memory", 42, 60),
            'sum(ceems_compute_unit_memory_used_bytes{uuid="42",manager="slurm",'
            'job="ceems"})',
        )
        self.assertEqual(
            self.exporter.promql("memory_allocated", 42, 60),
            'sum(ceems_compute_unit_memory_total_bytes{uuid="42",manager="slurm",'
            'job="ceems"})',
        )

    def test_promql_gpu(self):
        # GPU metrics are provided by CEEMS recording rules, only filtered by job ID.
        self.assertEqual(
            self.exporter.promql("gpu", 42, 60),
            'avg(uuid:ceems_gpu_usage:ratio{uuid="42"})',
        )
        self.assertEqual(
            self.exporter.promql("gpu_memory", 42, 60),
            'avg(uuid:ceems_gpu_memory_usage:ratio{uuid="42"})',
        )

    def test_promql_without_prometheus_job(self):
        exporter = SlurmwebJobMetricsExporterCEEMS(None)
        self.assertEqual(
            exporter.promql("memory", 42, 60),
            'sum(ceems_compute_unit_memory_used_bytes{uuid="42",manager="slurm"})',
        )

    def test_promql_escape(self):
        exporter = SlurmwebJobMetricsExporterCEEMS('ce"ems')
        self.assertIn('job="ce\\"ems"', exporter.promql("memory", 42, 60))

    def test_promql_unsupported(self):
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError, "^Unsupported job metric fail$"
        ):
            self.exporter.promql("fail", 42, 60)


class TestBuildExporters(unittest.TestCase):
    def test_build_ceems(self):
        settings = types.SimpleNamespace(job_exporters=["ceems"], ceems_job="foo")
        exporters = build_exporters(settings)
        self.assertEqual(len(exporters), 1)
        self.assertIsInstance(exporters[0], SlurmwebJobMetricsExporterCEEMS)
        self.assertEqual(exporters[0].prometheus_job, "foo")

    def test_build_empty(self):
        settings = types.SimpleNamespace(job_exporters=[], ceems_job="foo")
        self.assertEqual(build_exporters(settings), [])

    def test_build_unsupported(self):
        settings = types.SimpleNamespace(job_exporters=["fail"], ceems_job="foo")
        with self.assertRaisesRegex(
            SlurmwebConfigurationError, "^Unsupported job metrics exporter fail$"
        ):
            build_exporters(settings)


class FakeExporter(SlurmwebJobMetricsExporter):
    name = "fake"
    provides = ("gpu", "cpu")

    def promql(self, metric, job, window):
        return f"fake_{metric}"


class TestJobMetrics(unittest.TestCase):
    def setUp(self):
        self.db = SlurmwebMetricsDB(
            urllib.parse.urlparse("http://localhost:9090"), "slurm"
        )
        self.job_metrics = SlurmwebJobMetrics(
            self.db, [SlurmwebJobMetricsExporterCEEMS("ceems")]
        )

    def test_available(self):
        self.assertEqual(self.job_metrics.available(), list(JOB_METRICS))

    def test_available_none(self):
        self.assertEqual(SlurmwebJobMetrics(self.db, []).available(), [])

    def test_exporters_precedence(self):
        # The first exporter declared provides the metric, metrics are ordered as
        # JOB_METRICS.
        fake = FakeExporter()
        ceems = SlurmwebJobMetricsExporterCEEMS("ceems")
        job_metrics = SlurmwebJobMetrics(self.db, [fake, ceems])
        self.assertEqual(job_metrics.available(), list(JOB_METRICS))
        self.assertIs(job_metrics.exporters["cpu"], fake)
        self.assertIs(job_metrics.exporters["gpu"], fake)
        self.assertIs(job_metrics.exporters["memory"], ceems)
        self.assertEqual(
            SlurmwebJobMetrics(self.db, [fake]).available(), ["cpu", "gpu"]
        )

    def test_resolution(self):
        # Short job: minimal step and window
        self.assertEqual(SlurmwebJobMetrics.resolution(0, 60), (15, 60))
        # 1 hour: 300 points max, minimal window
        self.assertEqual(SlurmwebJobMetrics.resolution(0, 3600), (15, 60))
        # 1 day: step 288s, window equals step
        self.assertEqual(SlurmwebJobMetrics.resolution(0, 86400), (288, 288))
        # Step is rounded up
        self.assertEqual(SlurmwebJobMetrics.resolution(0, 86401), (289, 289))

    def test_request(self):
        responses = {
            "cpu": series([[1000, "50.5"], [1015, "75"]]),
            "memory": series([[1000, "1024"], [1015, "2048"]]),
            "memory_allocated": series([[1000, "4096"], [1015, "4096"]]),
            "gpu": [],
            "gpu_memory": [],
        }

        async def query_range(promql, start, end, step):
            self.assertEqual(start, 990)
            self.assertEqual(end, 1020)
            self.assertEqual(step, 15)
            for metric in ["memory_allocated", "gpu_memory", "cpu", "memory", "gpu"]:
                if promql == self.job_metrics.exporters[metric].promql(metric, 42, 60):
                    return responses[metric]
            self.fail(f"Unexpected query {promql}")

        with mock.patch.object(self.db, "query_range", side_effect=query_range):
            result = self.job_metrics.request(42, 1000, 1020)
        self.assertEqual(
            result,
            {
                "cpu": [[1000000, 50.5], [1015000, 75.0]],
                "memory": [[1000000, 1024.0], [1015000, 2048.0]],
                "memory_allocated": [[1000000, 4096.0], [1015000, 4096.0]],
                "gpu": [],
                "gpu_memory": [],
            },
        )

    def test_request_nan(self):
        # NaN values, eg. division by zero, are discarded.
        async def query_range(promql, start, end, step):
            return series([[1000, "NaN"], [1015, "12"]])

        with mock.patch.object(self.db, "query_range", side_effect=query_range):
            result = self.job_metrics.request(42, 1000, 1020)
        self.assertEqual(result["cpu"], [[1015000, 12.0]])

    def test_request_multiple_series(self):
        async def query_range(promql, start, end, step):
            return series([[1000, "1"]]) + series([[1000, "2"]])

        with mock.patch.object(self.db, "query_range", side_effect=query_range):
            with self.assertLogs("slurmweb", level="WARNING") as cm:
                result = self.job_metrics.request(42, 1000, 1020)
        self.assertEqual(result["cpu"], [[1000000, 1.0]])
        self.assertIn(
            "WARNING:slurmweb.metrics.jobs:Unexpected 2 series for job 42 metric "
            "cpu, keeping the first one",
            cm.output,
        )

    def test_request_unexpected_result(self):
        async def query_range(promql, start, end, step):
            return [{"metric": {}}]

        with mock.patch.object(self.db, "query_range", side_effect=query_range):
            with self.assertRaisesRegex(
                SlurmwebMetricsDBError, "^Unexpected result on job 42 metric"
            ):
                self.job_metrics.request(42, 1000, 1020)

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_request_db_empty(self, mock_get):
        # Request through metrics database with Prometheus response mock
        _, mock_get.return_value = mock_prometheus_response("unknown-metric")
        result = self.job_metrics.request(42, 1000, 1020)
        self.assertEqual(result, {metric: [] for metric in JOB_METRICS})
        # Check query_range request is sent with URL encoded PromQL query.
        url = mock_get.call_args_list[0].args[0]
        self.assertTrue(url.startswith("http://localhost:9090/api/v1/query_range?"))
        query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        self.assertEqual(query["start"], ["990"])
        self.assertEqual(query["end"], ["1020"])
        self.assertEqual(query["step"], ["15"])
        self.assertIn(
            query["query"][0],
            [
                self.job_metrics.exporters[metric].promql(metric, 42, 60)
                for metric in JOB_METRICS
            ],
        )

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_request_db_error(self, mock_get):
        _, mock_get.return_value = mock_prometheus_response("unknown-path")
        with self.assertRaisesRegex(
            SlurmwebMetricsDBError,
            "^Unexpected response status 400 for metrics database request",
        ):
            self.job_metrics.request(42, 1000, 1020)
