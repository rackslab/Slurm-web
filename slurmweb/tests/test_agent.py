# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


import unittest
from unittest import mock
import tempfile
from pathlib import Path
import os
import warnings

import requests
import json
from flask import Blueprint
from rfl.authentication.user import AuthenticatedUser

from slurmweb.version import get_version
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.agent import SlurmwebAppAgent
from slurmweb.errors import SlurmwebRestdError

CONF = """
[service]
cluster=test

[jwt]
key={key}

[policy]
definition={policy_defs}
vendor_roles={policy}
"""

ASSETS = Path(__file__).parent.resolve() / ".." / "tests" / "assets"


def slurm_versions():
    for path in (ASSETS / "slurmrestd").iterdir():
        yield path.name


def load_json_asset(path: Path):
    with open(ASSETS / path) as f:
        return json.load(f)


def all_slurm_versions(test):
    """Split test with a subtest for every slurm versions"""

    def inner(self, *args, **kwargs):
        for slurm_version in slurm_versions():
            with self.subTest(
                msg=f"slurm {slurm_version}", slurm_version=slurm_version
            ):
                test(self, slurm_version, *args, **kwargs)

    return inner


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

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_jobs(self, slurm_version, mock_slurmrest):
        try:
            jobs_asset = load_json_asset(f"slurmrestd/{slurm_version}/slurm-jobs.json")[
                "jobs"
            ]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = jobs_asset
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertCountEqual(response.json, jobs_asset)

    @mock.patch("slurmweb.views.agent.requests.Session")
    def test_request_jobs_connection_error(self, mock_requests_session):
        mock_requests_session.return_value.get.side_effect = (
            requests.exceptions.ConnectionError("connection error")
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

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_job_running(self, slurm_version, mock_slurmrest):
        try:
            slurm_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-job-running.json"
            )["jobs"]
            slurmdb_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurmdb-job-running.json"
            )["jobs"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.side_effect = [slurmdb_job_asset, slurm_job_asset]
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
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_job_pending(self, slurm_version, mock_slurmrest):
        try:
            slurm_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-job-pending.json"
            )["jobs"]
            slurmdb_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurmdb-job-pending.json"
            )["jobs"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.side_effect = [slurmdb_job_asset, slurm_job_asset]
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
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_job_completed(self, slurm_version, mock_slurmrest):
        try:
            slurm_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-job-completed.json"
            )["jobs"]
            slurmdb_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurmdb-job-completed.json"
            )["jobs"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.side_effect = [slurmdb_job_asset, slurm_job_asset]
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
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_job_archived(self, slurm_version, mock_slurmrest):
        try:
            slurmdb_job_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurmdb-job-archived.json"
            )["jobs"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.side_effect = [
            slurmdb_job_asset,
            SlurmwebRestdError(
                "job not found", 2017, "error description", "error  source"
            ),
        ]
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        # Unable to retrieve tres_req_str only provided by slurmctld
        self.assertNotIn("tres_req_str", response.json)

    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_job_not_found(self, mock_slurmrest):
        mock_slurmrest.side_effect = IndexError
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
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_nodes(self, slurm_version, mock_slurmrest):
        try:
            nodes_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-nodes.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = nodes_asset
        response = self.client.get(f"/v{get_version()}/nodes")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertCountEqual(response.json, nodes_asset)

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_node_idle(self, slurm_version, mock_slurmrest):
        try:
            node_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-node-idle.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = node_asset
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json, node_asset[0])
        self.assertIn("IDLE", response.json["state"])

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_node_allocated(self, slurm_version, mock_slurmrest):
        try:
            node_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-node-allocated.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = node_asset
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json, node_asset[0])
        self.assertIn("ALLOCATED", response.json["state"])

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_node_mixed(self, slurm_version, mock_slurmrest):
        try:
            node_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-node-mixed.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = node_asset
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json, node_asset[0])
        self.assertIn("MIXED", response.json["state"])

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_node_down(self, slurm_version, mock_slurmrest):
        try:
            node_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-node-down.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = node_asset
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json, node_asset[0])
        self.assertIn("DOWN", response.json["state"])

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_node_drained(self, slurm_version, mock_slurmrest):
        try:
            node_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-node-drain.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = node_asset
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json, node_asset[0])
        self.assertIn("DRAIN", response.json["state"])

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_node_draining(self, slurm_version, mock_slurmrest):
        try:
            node_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-node-draining.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = node_asset
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json, node_asset[0])
        self.assertIn("DRAINING", response.json["state"])

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.requests.Session")
    def test_request_node_not_found(self, slurm_version, mock_requests_session):
        fake_response = requests.Response()
        fake_response.headers = {"content-type": "application/json"}
        fake_response.json = lambda: load_json_asset(
            f"slurmrestd/{slurm_version}/slurm-node-unfound.json"
        )
        mock_requests_session.return_value.get.return_value = fake_response
        response = self.client.get(f"/v{get_version()}/node/not-found")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json,
            {
                "code": 500,
                "description": (
                    "slurmrestd errors: [{'description': 'Failure to query node "
                    "unexisting-node', 'source': '_dump_nodes'}]"
                ),
                "name": "Internal Server Error",
            },
        )

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_stats(self, slurm_version, mock_slurmrest):
        try:
            ping_asset = load_json_asset(f"slurmrestd/{slurm_version}/slurm-ping.json")[
                "meta"
            ]
            jobs_asset = load_json_asset(f"slurmrestd/{slurm_version}/slurm-jobs.json")[
                "jobs"
            ]
            nodes_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-nodes.json"
            )["nodes"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.side_effect = [ping_asset, jobs_asset, nodes_asset]
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
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_partitions(self, slurm_version, mock_slurmrest):
        try:
            partitions_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-partitions.json"
            )["partitions"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = partitions_asset
        response = self.client.get(f"/v{get_version()}/partitions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertCountEqual(response.json, partitions_asset)

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_qos(self, slurm_version, mock_slurmrest):
        try:
            qos_asset = load_json_asset(f"slurmrestd/{slurm_version}/slurm-qos.json")[
                "qos"
            ]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = qos_asset
        response = self.client.get(f"/v{get_version()}/qos")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertCountEqual(response.json, qos_asset)

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_reservations(self, slurm_version, mock_slurmrest):
        try:
            reservations_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-reservations.json"
            )["reservations"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = reservations_asset
        response = self.client.get(f"/v{get_version()}/reservations")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertCountEqual(response.json, reservations_asset)

    @all_slurm_versions
    @mock.patch("slurmweb.views.agent.slurmrest")
    def test_request_accounts(self, slurm_version, mock_slurmrest):
        try:
            accounts_asset = load_json_asset(
                f"slurmrestd/{slurm_version}/slurm-accounts.json"
            )["accounts"]
        except FileNotFoundError as err:
            warnings.warn(f"Missing slurm asset: {err}")
            return
        mock_slurmrest.return_value = accounts_asset
        response = self.client.get(f"/v{get_version()}/accounts")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertCountEqual(response.json, accounts_asset)

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
