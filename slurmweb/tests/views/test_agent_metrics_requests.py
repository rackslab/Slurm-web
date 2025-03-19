# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


from unittest import mock
import textwrap

from slurmweb.version import get_version
from slurmweb.errors import SlurmwebMetricsDBError

from ..lib.agent import TestAgentBase, RemoveActionInPolicy
from ..lib.utils import mock_prometheus_response


class TestAgentMetricsRequest(TestAgentBase):
    def setUp(self):
        self.setup_client(
            additional_conf=textwrap.dedent(
                """

                [metrics]
                enabled=yes
                """
            )
        )

    def tearDown(self):
        self.app.metrics_collector.unregister()

    def test_request_metrics_error(self):
        self.app.metrics_db.request = mock.Mock(
            side_effect=SlurmwebMetricsDBError("fake metrics request error")
        )
        response = self.client.get(f"/v{get_version()}/metrics/nodes")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json,
            {
                "code": 500,
                "description": "fake metrics request error",
                "name": "Internal Server Error",
            },
        )

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_metrics_nodes(self, mock_requests_get):
        _, mock_requests_get.return_value = mock_prometheus_response("nodes-hour")
        response = self.client.get(f"/v{get_version()}/metrics/nodes")
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.json.keys(),
            ["allocated", "down", "drain", "idle", "mixed", "unknown"],
        )

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_metrics_cores(self, mock_requests_get):
        _, mock_requests_get.return_value = mock_prometheus_response("cores-hour")
        response = self.client.get(f"/v{get_version()}/metrics/cores")
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.json.keys(),
            ["allocated", "down", "drain", "idle", "unknown"],
        )

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_metrics_jobs(self, mock_requests_get):
        _, mock_requests_get.return_value = mock_prometheus_response("jobs-hour")
        response = self.client.get(f"/v{get_version()}/metrics/jobs")
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.json.keys(),
            [
                "cancelled",
                "completed",
                "completing",
                "failed",
                "timeout",
                "pending",
                "running",
                "unknown",
            ],
        )

    def test_request_metrics_nodes_denied(self):
        with RemoveActionInPolicy(self.app.policy, "user", "view-nodes"):
            with self.assertLogs("slurmweb", level="WARNING") as cm:
                response = self.client.get(f"/v{get_version()}/metrics/nodes")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": "Access to nodes metric not permitted",
                "name": "Forbidden",
            },
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.views.agent:Unauthorized access from user test (∅) "
                "[group] to nodes metric (missing permission on view-nodes)"
            ],
        )

    def test_request_metrics_cores_denied(self):
        with RemoveActionInPolicy(self.app.policy, "user", "view-nodes"):
            with self.assertLogs("slurmweb", level="WARNING") as cm:
                response = self.client.get(f"/v{get_version()}/metrics/cores")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": "Access to cores metric not permitted",
                "name": "Forbidden",
            },
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.views.agent:Unauthorized access from user test (∅) "
                "[group] to cores metric (missing permission on view-nodes)"
            ],
        )

    def test_request_metrics_jobs_denied(self):
        with RemoveActionInPolicy(self.app.policy, "user", "view-jobs"):
            with self.assertLogs("slurmweb", level="WARNING") as cm:
                response = self.client.get(f"/v{get_version()}/metrics/jobs")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": "Access to jobs metric not permitted",
                "name": "Forbidden",
            },
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.views.agent:Unauthorized access from user test (∅) "
                "[group] to jobs metric (missing permission on view-jobs)"
            ],
        )

    @mock.patch("slurmweb.metrics.db.requests.get")
    def test_request_metrics_unexpected(self, mock_requests_get):
        _, mock_requests_get.return_value = mock_prometheus_response("unknown-metric")
        response = self.client.get(f"/v{get_version()}/metrics/jobs")
        self.assertEqual(response.status_code, 500)
        self.assertRegex(response.json["description"], "^Empty result for query .*$")

    def test_request_metrics_unexisting(self):
        response = self.client.get(f"/v{get_version()}/metrics/fail")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": "Metric fail not found",
                "name": "Not Found",
            },
        )
