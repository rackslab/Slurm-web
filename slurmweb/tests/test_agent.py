# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


import unittest
from unittest import mock
import tempfile
import os
import textwrap
import ipaddress
import random

import werkzeug
from flask import Blueprint
from rfl.authentication.user import AuthenticatedUser
import ClusterShell
from prometheus_client.parser import text_string_to_metric_families

from slurmweb.version import get_version
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.agent import SlurmwebAppAgent
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestdInternalError,
)
from slurmweb.errors import SlurmwebCacheError, SlurmwebMetricsDBError

from .utils import (
    all_slurm_versions,
    mock_slurmrestd_responses,
    mock_prometheus_response,
    SlurmwebAssetUnavailable,
    SlurmwebCustomTestResponse,
    RemoveActionInPolicy,
)

CONF = """
[service]
cluster=test

[jwt]
key={key}

[policy]
definition={policy_defs}
vendor_roles={policy}
"""


class FakeRacksDBWebBlueprint(Blueprint):
    """Fake RacksDB web blueprint to avoid testing RacksDB in the scope of
    Slurm-web test cases."""

    def __init__(self, **kwargs):
        super().__init__("Fake RacksDB web blueprint", __name__)


class TestAgentBase(unittest.TestCase):

    def setup_client(self, additional_conf=None):
        # Generate JWT signing key
        key = tempfile.NamedTemporaryFile(mode="w+")
        key.write("hey")
        key.seek(0)

        vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "conf", "vendor"
        )

        # Policy definition path
        policy_defs = os.path.join(vendor_path, "policy.yml")

        # Policy path
        policy = os.path.join(vendor_path, "policy.ini")

        # Generate configuration file
        conf = tempfile.NamedTemporaryFile(mode="w+")
        conf_content = CONF
        if additional_conf is not None:
            conf_content += additional_conf
        conf.write(
            conf_content.format(key=key.name, policy_defs=policy_defs, policy=policy)
        )
        conf.seek(0)

        # Configuration definition path
        conf_defs = os.path.join(vendor_path, "agent.yml")

        # Start the app with mocked RacksDB web blueprint
        with mock.patch("slurmweb.apps.agent.RacksDBWebBlueprint") as m:
            m.return_value = FakeRacksDBWebBlueprint()
            self.app = SlurmwebAppAgent(
                SlurmwebConfSeed(
                    debug=False,
                    log_flags=["ALL"],
                    debug_flags=[],
                    conf_defs=conf_defs,
                    conf=conf.name,
                )
            )
        conf.close()
        key.close()
        self.app.config.update(
            {
                "TESTING": True,
            }
        )

        # Get token valid to get user role with all permissions as defined in
        # default policy.
        token = self.app.jwt.generate(
            user=AuthenticatedUser(
                login="test", fullname="Testing User", groups=["group"]
            ),
            duration=3600,
        )
        # werkzeug.test.TestResponse class does not have text property in
        # werkzeug <= 2.1. When such version is installed, use custom test
        # response class to backport this text property.
        try:
            getattr(werkzeug.test.TestResponse, 'text')
        except AttributeError:
            self.app.response_class = SlurmwebCustomTestResponse
        self.client = self.app.test_client()
        self.client.environ_base["HTTP_AUTHORIZATION"] = "Bearer " + token

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.app.slurmrestd, slurm_version, assets)


class TestAgent(TestAgentBase):

    def setUp(self):
        self.setup_client()

    #
    # Generic routes (without slurmrestd requests)
    #

    def test_version(self):
        response = self.client.get("/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web agent v{get_version()}\n")

    def test_info(self):
        response = self.client.get(f"/v{get_version()}/info")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 3)
        self.assertIn("cluster", response.json)
        self.assertEqual(response.json["cluster"], "test")
        self.assertIn("infrastructure", response.json)
        self.assertEqual(response.json["infrastructure"], "test")
        self.assertIn("metrics", response.json)
        self.assertIsInstance(response.json["metrics"], bool)

    def test_permissions(self):
        response = self.client.get(f"/v{get_version()}/permissions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 2)
        self.assertIn("actions", response.json)
        self.assertIn("roles", response.json)
        self.assertCountEqual(response.json["roles"], ["user", "anonymous"])

    #
    # General error cases
    #

    def test_request_slurmrestd_connection_error(self):
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestConnectionError("connection error")
        )
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json,
            {
                "code": 500,
                "description": "Unable to connect to slurmrestd: connection error",
                "name": "Internal Server Error",
            },
        )

    def test_request_slurmrestd_invalid_type(self):
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdInvalidResponseError("invalid type")
        )
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json,
            {
                "code": 500,
                "description": "Invalid response from slurmrestd: invalid type",
                "name": "Internal Server Error",
            },
        )

    @all_slurm_versions
    def test_request_slurmrestd_not_found(self, slurm_version):
        try:
            [slurm_not_found_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurm-not-found", None)],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": "URL not found on slurmrestd: /mocked/query",
                "name": "Not Found",
            },
        )

    def test_request_agent_not_found(self):
        response = self.client.get("/fail")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": (
                    "The requested URL was not found on the server. If you entered "
                    "the URL manually please check your spelling and try again."
                ),
                "name": "Not Found",
            },
        )

    def test_access_denied(self):
        # Test agent permission denied with @rbac_action decorator by calling /accounts
        # without authentication token, ie. as anonymous who is denied to access this
        # route in Slurm-web default authorization policy.
        del self.client.environ_base["HTTP_AUTHORIZATION"]
        response = self.client.get(f"/v{get_version()}/accounts")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": (
                    "Anonymous role is not allowed to perform action view-accounts"
                ),
                "name": "Forbidden",
            },
        )

    def test_invalid_token(self):
        self.client.environ_base["HTTP_AUTHORIZATION"] = "Bearer failed"
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json,
            {
                "code": 401,
                "description": "Unable to decode token: Not enough segments",
                "name": "Unauthorized",
            },
        )

    #
    # slurmrestd ressources
    #

    @all_slurm_versions
    def test_request_jobs(self, slurm_version):
        try:
            [jobs_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(jobs_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["job_id"], jobs_asset[idx]["job_id"])

    @all_slurm_versions
    def test_request_jobs_node(self, slurm_version):
        try:
            [jobs_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return

        def terminated(job):
            for terminated_state in ["COMPLETED", "FAILED", "TIMEOUT"]:
                if terminated_state in job["job_state"]:
                    return True
            return False

        # Select random busy node on cluster
        busy_nodes = ClusterShell.NodeSet.NodeSet()
        for job in jobs_asset:
            if not terminated(job):
                busy_nodes.update(job["nodes"])
        random_busy_node = random.choice(busy_nodes)

        response = self.client.get(f"/v{get_version()}/jobs?node={random_busy_node}")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)

        # Check we have results but less that full list of jobs.
        self.assertNotEqual(len(response.json), 0)
        self.assertLess(len(response.json), len(jobs_asset))

        # Check all jobs are not completed and have the random busy node allocated.
        for job in response.json:
            self.assertNotIn(job["job_state"], ["COMPLETED", "FAILED", "TIMEOUT"])
            self.assertIn(
                random_busy_node,
                ClusterShell.NodeSet.NodeSet(job["nodes"]),
            )

    @all_slurm_versions
    def test_request_job_running(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-running", "jobs"), ("slurm-job-running", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        self.assertEqual(
            response.json["tres_req_str"], slurm_job_asset[0]["tres_req_str"]
        )

    @all_slurm_versions
    def test_request_job_pending(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-pending", "jobs"), ("slurm-job-pending", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        self.assertEqual(
            response.json["tres_req_str"], slurm_job_asset[0]["tres_req_str"]
        )

    @all_slurm_versions
    def test_request_job_completed(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-completed", "jobs"), ("slurm-job-completed", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        self.assertEqual(
            response.json["tres_req_str"], slurm_job_asset[0]["tres_req_str"]
        )

    @all_slurm_versions
    def test_request_job_failed(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-failed", "jobs"), ("slurm-job-failed", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        self.assertEqual(
            response.json["tres_req_str"], slurm_job_asset[0]["tres_req_str"]
        )

    @all_slurm_versions
    def test_request_job_timeout(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-timeout", "jobs"), ("slurm-job-timeout", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        self.assertEqual(
            response.json["tres_req_str"], slurm_job_asset[0]["tres_req_str"]
        )

    @all_slurm_versions
    def test_request_job_archived(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-archived", "jobs"), ("slurm-job-archived", None)],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        # Unable to retrieve tres_req_str only provided by slurmctld
        self.assertNotIn("tres_req_str", response.json)

    @all_slurm_versions
    def test_request_job_not_found(self, slurm_version):
        try:
            [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-unfound", "jobs"), ("slurm-job-unfound", None)],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": "URL not found on slurmrestd: Job 1 not found",
                "name": "Not Found",
            },
        )

    @all_slurm_versions
    def test_request_nodes(self, slurm_version):
        try:
            [nodes_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-nodes", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/nodes")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(nodes_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], nodes_asset[idx]["name"])

    @all_slurm_versions
    def test_request_node_idle(self, slurm_version):
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-idle", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("IDLE", response.json["state"])

    @all_slurm_versions
    def test_request_node_allocated(self, slurm_version):
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurm-node-allocated", "nodes")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("ALLOCATED", response.json["state"])

    @all_slurm_versions
    def test_request_node_mixed(self, slurm_version):
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-mixed", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("MIXED", response.json["state"])

    @all_slurm_versions
    def test_request_node_down(self, slurm_version):
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-down", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("DOWN", response.json["state"])

    @all_slurm_versions
    def test_request_node_drained(self, slurm_version):
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-drain", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("DRAIN", response.json["state"])

    @all_slurm_versions
    def test_request_node_draining(self, slurm_version):
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-draining", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("DRAINING", response.json["state"])

    @all_slurm_versions
    def test_request_node_not_found(self, slurm_version):
        try:
            self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-unfound", None)]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/not-found")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": "URL not found on slurmrestd: Node not-found not found",
                "name": "Not Found",
            },
        )

    @all_slurm_versions
    def test_request_stats(self, slurm_version):
        try:
            [ping_asset, jobs_asset, nodes_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [
                    ("slurm-ping", "meta"),
                    ("slurm-jobs", "jobs"),
                    ("slurm-nodes", "nodes"),
                ],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/stats")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertIn("jobs", response.json)
        self.assertIn("resources", response.json)
        self.assertIn("version", response.json)
        self.assertEqual(response.json["jobs"]["total"], len(jobs_asset))
        self.assertEqual(
            response.json["jobs"]["running"],
            len([job for job in jobs_asset if "RUNNING" in job["job_state"]]),
        )
        self.assertEqual(response.json["resources"]["nodes"], len(nodes_asset))
        self.assertEqual(
            response.json["resources"]["cores"],
            sum([node["cpus"] for node in nodes_asset]),
        )
        self.assertEqual(response.json["version"], ping_asset["slurm"]["release"])

    @all_slurm_versions
    def test_request_partitions(self, slurm_version):
        try:
            [partitions_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurm-partitions", "partitions")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/partitions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(partitions_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], partitions_asset[idx]["name"])

    @all_slurm_versions
    def test_request_qos(self, slurm_version):
        try:
            [qos_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-qos", "qos")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/qos")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(qos_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], qos_asset[idx]["name"])

    @all_slurm_versions
    def test_request_reservations(self, slurm_version):
        try:
            [reservations_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurm-reservations", "reservations")],
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/reservations")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(reservations_asset))
        for idx in range(len(response.json)):
            self.assertEqual(
                response.json[idx]["name"], reservations_asset[idx]["name"]
            )

    @all_slurm_versions
    def test_request_accounts(self, slurm_version):
        try:
            [accounts_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-accounts", "accounts")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/accounts")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(accounts_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], accounts_asset[idx]["name"])

    def test_request_metrics(self):
        # Metrics feature is disabled in this test case, check that the corresponding
        # endpoint returns HTTP/404 (not found).
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 404)


class TestAgentMetricsCollector(TestAgentBase):

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

    @all_slurm_versions
    def test_request_metrics(self, slurm_version):
        try:
            [nodes_asset, jobs_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurm-nodes", "nodes"), ("slurm-jobs", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
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
