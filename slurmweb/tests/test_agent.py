# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


import unittest
from unittest import mock
import tempfile
import os

from flask import Blueprint
from rfl.authentication.user import AuthenticatedUser

from slurmweb.version import get_version
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.agent import SlurmwebAppAgent
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdInvalidResponseError,
)

from .utils import (
    all_slurm_versions,
    mock_slurmrestd_responses,
    SlurmwebAssetUnavailable,
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


class TestAgent(unittest.TestCase):
    def setUp(self):
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
        conf.write(CONF.format(key=key.name, policy_defs=policy_defs, policy=policy))
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
        self.client = self.app.test_client()
        self.client.environ_base["HTTP_AUTHORIZATION"] = "Bearer " + token

    #
    # Generic routes (without slurmrestd requests)
    #

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.app.slurmrestd, slurm_version, assets)

    def test_version(self):
        response = self.client.get("/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web agent v{get_version()}\n")

    def test_info(self):
        response = self.client.get(f"/v{get_version()}/info")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 2)
        self.assertIn("cluster", response.json)
        self.assertEqual(response.json["cluster"], "test")
        self.assertIn("infrastructure", response.json)
        self.assertEqual(response.json["infrastructure"], "test")

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
        self.app.slurmrestd.request = mock.Mock(
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
        self.app.slurmrestd.request = mock.Mock(
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
                "description": "Job 1 not found",
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
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-unfound", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.client.get(f"/v{get_version()}/node/not-found")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": "Node not-found not found",
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
        self.assertEqual(response.json["version"], ping_asset["Slurm"]["release"])

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
