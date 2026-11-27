# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from unittest import mock
import time
import urllib.parse

from slurmweb.version import get_version
from slurmweb.errors import SlurmwebMetricsDBError
from slurmweb.metrics.jobs import JOB_METRICS, SlurmwebJobMetrics

from ..lib.agent import TestAgentBase, ModifyActionsInPolicy
from ..lib.utils import load_json_asset, mock_prometheus_response


def fake_job(start, end, user="test", account="physic"):
    return {
        "job_id": 42,
        "user": user,
        "account": account,
        "time": {"start": start, "end": end},
    }


class TestAgentJobMetricsRequest(TestAgentBase):
    def setUp(self):
        self.setup_client(metrics=True, job_exporters=["ceems"])

    def tearDown(self):
        self.app.metrics_collector.unregister()

    def test_info(self):
        response = self.client.get("/info")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["job_metrics"], list(JOB_METRICS))

    def request_job_metrics(self, job, metrics=None, query=""):
        with mock.patch.object(
            self.app.slurmrestd, "job", return_value=job
        ), mock.patch.object(
            self.app.job_metrics, "request", return_value=metrics
        ) as mock_request:
            response = self.client.get(f"/v{get_version()}/job/42/metrics{query}")
        return response, mock_request

    def test_job_metrics_completed(self):
        metrics = {metric: [[1000000, 1.0]] for metric in JOB_METRICS}
        response, mock_request = self.request_job_metrics(fake_job(1000, 2000), metrics)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, metrics)
        mock_request.assert_called_once_with(42, 1000, 2000, False)

    def test_job_metrics_detail(self):
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?detail=true"
        )
        self.assertEqual(response.status_code, 200)
        mock_request.assert_called_once_with(42, 1000, 2000, True)

    def test_job_metrics_detail_false(self):
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?detail=false"
        )
        self.assertEqual(response.status_code, 200)
        mock_request.assert_called_once_with(42, 1000, 2000, False)

    def test_job_metrics_detail_invalid(self):
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?detail=fail"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid detail parameter fail", response.text)
        mock_request.assert_not_called()

    def test_job_metrics_range(self):
        # Requested range within job range.
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?start=1200&end=1500"
        )
        self.assertEqual(response.status_code, 200)
        mock_request.assert_called_once_with(42, 1200, 1500, False)

    def test_job_metrics_range_clamped(self):
        # Requested range is restricted to job range.
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?start=500&end=3000&detail=true"
        )
        self.assertEqual(response.status_code, 200)
        mock_request.assert_called_once_with(42, 1000, 2000, True)

    def test_job_metrics_range_only_start(self):
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?start=1500"
        )
        self.assertEqual(response.status_code, 200)
        mock_request.assert_called_once_with(42, 1500, 2000, False)

    def test_job_metrics_range_outside_job(self):
        # Requested range does not overlap job range: no metrics are requested.
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?start=3000&end=4000"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {})
        mock_request.assert_not_called()

    def test_job_metrics_range_empty(self):
        response, mock_request = self.request_job_metrics(
            fake_job(1000, 2000), {}, "?start=1500&end=1200"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {})
        mock_request.assert_not_called()

    def test_job_metrics_range_invalid(self):
        for query, description in [
            ("?start=fail", "Invalid start parameter fail"),
            ("?end=1.5", "Invalid end parameter 1.5"),
        ]:
            response, mock_request = self.request_job_metrics(
                fake_job(1000, 2000), {}, query
            )
            self.assertEqual(response.status_code, 400)
            self.assertIn(description, response.text)
            mock_request.assert_not_called()

    def test_job_metrics_running(self):
        # Running job, end time is unknown (0): range ends now.
        start = int(time.time()) - 3600
        response, mock_request = self.request_job_metrics(fake_job(start, 0), {})
        self.assertEqual(response.status_code, 200)
        args = mock_request.call_args.args
        self.assertEqual(args[:2], (42, start))
        self.assertAlmostEqual(args[2], int(time.time()), delta=5)

    def test_job_metrics_running_expected_end(self):
        # Running job with expected end time in the future: range ends now.
        now = int(time.time())
        response, mock_request = self.request_job_metrics(
            fake_job(now - 3600, now + 3600), {}
        )
        self.assertEqual(response.status_code, 200)
        self.assertAlmostEqual(mock_request.call_args.args[2], now, delta=5)

    def test_job_metrics_pending(self):
        # Pending job is not started, no metrics are requested.
        response, mock_request = self.request_job_metrics(fake_job(0, 0))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {})
        mock_request.assert_not_called()

    def test_job_metrics_pending_expected_start(self):
        # Pending job with expected start time in the future.
        now = int(time.time())
        response, mock_request = self.request_job_metrics(fake_job(now + 3600, 0))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {})
        mock_request.assert_not_called()

    def test_job_metrics_own_only(self):
        with ModifyActionsInPolicy(
            self.app.policy, "user", remove="jobs-view", add="jobs-view-own"
        ):
            response, _ = self.request_job_metrics(fake_job(1000, 2000), {})
        self.assertEqual(response.status_code, 200)

    def test_job_metrics_own_only_not_found(self):
        with ModifyActionsInPolicy(
            self.app.policy, "user", remove="jobs-view", add="jobs-view-own"
        ):
            response, mock_request = self.request_job_metrics(
                fake_job(1000, 2000, user="other"), {}
            )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {"code": 404, "description": "Job not found", "name": "Not Found"},
        )
        mock_request.assert_not_called()

    def test_job_metrics_denied(self):
        with ModifyActionsInPolicy(self.app.policy, "user", remove="jobs-view"):
            response, mock_request = self.request_job_metrics(fake_job(1000, 2000))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": "User is not allowed to view jobs",
                "name": "Forbidden",
            },
        )
        mock_request.assert_not_called()

    def test_job_metrics_db_error(self):
        with mock.patch.object(
            self.app.slurmrestd, "job", return_value=fake_job(1000, 2000)
        ), mock.patch.object(
            self.app.job_metrics,
            "request",
            side_effect=SlurmwebMetricsDBError("metrics error"),
        ):
            with self.assertLogs("slurmweb", level="WARNING") as cm:
                response = self.client.get(f"/v{get_version()}/job/42/metrics")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json,
            {
                "code": 500,
                "description": "metrics error",
                "name": "Internal Server Error",
            },
        )
        self.assertEqual(cm.output, ["WARNING:slurmweb.views.agent:metrics error"])

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_job_metrics_prometheus(self, mock_get):
        # Prometheus responses crawled with CEEMS exporter and its GPU recording
        # rules for a job with 2 GPUs.
        assets = {
            "cpu": "job-cpu",
            "memory": "job-memory",
            "memory_allocated": "job-memory-allocated",
            "gpu": "job-gpu",
            "gpu_memory": "job-gpu-memory",
        }
        # Expected response is computed from Prometheus assets, with timestamps
        # converted to milliseconds and values to floats.
        expected = {}
        for metric, asset in assets.items():
            series = load_json_asset(f"prometheus/{asset}.json")["data"]["result"]
            self.assertEqual(len(series), 1)
            expected[metric] = [
                [int(timestamp * 1000), float(value)]
                for timestamp, value in series[0]["values"]
            ]
        start = expected["memory"][0][0] // 1000
        end = expected["memory"][-1][0] // 1000

        # Return Prometheus asset of the metric requested by the agent.
        exporter = self.app.job_metrics.exporters["cpu"]
        _, window = SlurmwebJobMetrics.resolution(start, end)

        def prometheus_response(url):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["query"][0]
            for metric, asset in assets.items():
                if query == exporter.promql(metric, 42, window):
                    return mock_prometheus_response(asset)[1]
            return mock_prometheus_response("unknown-metric")[1]

        mock_get.side_effect = prometheus_response
        with mock.patch.object(
            self.app.slurmrestd, "job", return_value=fake_job(start, end)
        ):
            response = self.client.get(f"/v{get_version()}/job/42/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, expected)
        # GPU metrics are available for this job.
        self.assertTrue(response.json["gpu"])
        self.assertTrue(response.json["gpu_memory"])
        self.assertEqual(mock_get.call_count, len(JOB_METRICS))

    @mock.patch("slurmweb.metrics.db.aiohttp.ClientSession.get")
    def test_job_metrics_no_data(self, mock_get):
        # Prometheus returns empty results for all metrics, eg. when the job is too
        # old for Prometheus retention.
        _, mock_get.return_value = mock_prometheus_response("unknown-metric")
        with mock.patch.object(
            self.app.slurmrestd, "job", return_value=fake_job(1000, 2000)
        ):
            response = self.client.get(f"/v{get_version()}/job/42/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {metric: [] for metric in JOB_METRICS})


class TestAgentJobMetricsRequestNoExporter(TestAgentBase):
    def setUp(self):
        self.setup_client(metrics=True)

    def tearDown(self):
        self.app.metrics_collector.unregister()

    def test_info(self):
        response = self.client.get("/info")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["job_metrics"], [])

    def test_job_metrics_disabled(self):
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            response = self.client.get(f"/v{get_version()}/job/42/metrics")
        self.assertEqual(response.status_code, 501)
        self.assertEqual(
            response.json,
            {
                "code": 501,
                "description": "Jobs metrics are disabled, unable to query values",
                "name": "Not Implemented",
            },
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.views.agent:Jobs metrics are disabled, unable to "
                "query values"
            ],
        )


class TestAgentJobMetricsRequestMetricsDisabled(TestAgentBase):
    def setUp(self):
        # Jobs exporters are ignored when metrics are disabled.
        self.setup_client(metrics=False, job_exporters=["ceems"])

    def test_job_metrics_disabled(self):
        with self.assertLogs("slurmweb", level="WARNING"):
            response = self.client.get(f"/v{get_version()}/job/42/metrics")
        self.assertEqual(response.status_code, 501)
