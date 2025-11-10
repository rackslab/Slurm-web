# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT


from unittest import mock
import random

import ClusterShell

from racksdb.version import get_version as racksdb_get_version

from slurmweb.version import get_version
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdInvalidResponseError,
)
from slurmweb.cache import CachingService

from ..lib.agent import TestAgentBase
from ..lib.utils import all_slurm_api_versions, flask_404_description


class TestAgentViews(TestAgentBase):
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
        response = self.client.get("/info")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 5)
        self.assertIn("cluster", response.json)
        self.assertEqual(response.json["cluster"], "test")
        self.assertIn("racksdb", response.json)
        self.assertIsInstance(response.json["racksdb"], dict)
        self.assertIn("version", response.json["racksdb"])
        self.assertEqual(response.json["racksdb"]["version"], racksdb_get_version())
        self.assertIn("infrastructure", response.json["racksdb"])
        self.assertEqual(response.json["racksdb"]["infrastructure"], "test")
        self.assertIn("metrics", response.json)
        self.assertIsInstance(response.json["metrics"], bool)
        self.assertIn("cache", response.json)
        self.assertIsInstance(response.json["cache"], bool)
        self.assertIn("version", response.json)
        self.assertIsInstance(response.json["version"], str)
        self.assertEqual(response.json["version"], get_version())

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

    @all_slurm_api_versions
    def test_request_slurmrestd_not_found(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurm_not_found_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-not-found", None)],
        )

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

    @all_slurm_api_versions
    def test_request_slurmrestd_authentication_error(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurm_not_found_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-jwt-invalid-headers", None)],
        )
        response = self.client.get(f"/v{get_version()}/jobs")
        # FIXME: There is a regression in Slurm 25.11.0 which return HTTP/500 in this
        # case, see https://support.schedmd.com/show_bug.cgi?id=24052 for details.
        # This is a temporary workaround to accept both HTTP/401 and HTTP/500.
        self.assertIn(response.status_code, [401, 500])
        if response.status_code == 401:
            self.assertEqual(
                response.json,
                {
                    "code": 401,
                    "description": "Authentication error on slurmrestd: /mocked/query",
                    "name": "Unauthorized",
                },
            )
        else:
            self.assertEqual(
                response.json,
                {
                    "code": 500,
                    "description": "Authentication error on slurmrestd: /mocked/query",
                    "name": "Internal Server Error",
                },
            )

    def test_request_agent_not_found(self):
        response = self.client.get("/fail")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": flask_404_description,
                "name": "Not Found",
            },
        )

    #
    # slurmrestd ressources
    #

    @all_slurm_api_versions
    def test_request_jobs(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [jobs_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-jobs", "jobs")],
        )

        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(jobs_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["job_id"], jobs_asset[idx]["job_id"])

    @all_slurm_api_versions
    def test_request_jobs_node(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [jobs_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-jobs", "jobs")],
        )

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

    @all_slurm_api_versions
    def test_request_job_running(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-running", "jobs"), ("slurm-job-running", "jobs")],
        )
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

    @all_slurm_api_versions
    def test_request_job_pending(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-pending", "jobs"), ("slurm-job-pending", "jobs")],
        )
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

    @all_slurm_api_versions
    def test_request_job_completed(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-completed", "jobs"), ("slurm-job-completed", "jobs")],
        )
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

    @all_slurm_api_versions
    def test_request_job_failed(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-failed", "jobs"), ("slurm-job-failed", "jobs")],
        )
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

    @all_slurm_api_versions
    def test_request_job_timeout(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-timeout", "jobs"), ("slurm-job-timeout", "jobs")],
        )
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

    @all_slurm_api_versions
    def test_request_job_archived(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-archived", "jobs"), ("slurm-job-archived", None)],
        )
        response = self.client.get(f"/v{get_version()}/job/1")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["state"], slurmdb_job_asset[0]["state"])
        self.assertEqual(
            response.json["association"], slurmdb_job_asset[0]["association"]
        )
        # Unable to retrieve tres_req_str only provided by slurmctld
        self.assertNotIn("tres_req_str", response.json)

    @all_slurm_api_versions
    def test_request_job_not_found(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_job_asset, slurm_job_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-unfound", "jobs"), ("slurm-job-unfound", None)],
        )
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

    @all_slurm_api_versions
    def test_request_nodes(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [nodes_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-nodes", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/nodes")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(nodes_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], nodes_asset[idx]["name"])

    @all_slurm_api_versions
    def test_request_node_idle(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [node_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-idle", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("IDLE", response.json["state"])

    @all_slurm_api_versions
    def test_request_node_allocated(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [node_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-allocated", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("ALLOCATED", response.json["state"])

    @all_slurm_api_versions
    def test_request_node_mixed(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [node_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-mixed", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("MIXED", response.json["state"])

    @all_slurm_api_versions
    def test_request_node_down(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [node_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-down", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("DOWN", response.json["state"])

    @all_slurm_api_versions
    def test_request_node_drained(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [node_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-drain", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("DRAIN", response.json["state"])

    @all_slurm_api_versions
    def test_request_node_draining(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [node_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-draining", "nodes")],
        )
        response = self.client.get(f"/v{get_version()}/node/cn01")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(response.json["name"], node_asset[0]["name"])
        self.assertIn("DRAIN", response.json["state"])
        self.assertTrue(
            "MIXED" in response.json["state"] or "ALLOCATED" in response.json["state"]
        )

    @all_slurm_api_versions
    def test_request_node_not_found(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-unfound", None)],
        )
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

    @all_slurm_api_versions
    def test_request_stats(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [jobs_asset, nodes_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [
                ("slurm-jobs", "jobs"),
                ("slurm-nodes", "nodes"),
            ],
        )
        response = self.client.get(f"/v{get_version()}/stats")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertIn("jobs", response.json)
        self.assertIn("resources", response.json)
        self.assertEqual(response.json["jobs"]["total"], len(jobs_asset))
        self.assertEqual(
            response.json["jobs"]["running"],
            len([job for job in jobs_asset if "RUNNING" in job["job_state"]]),
        )
        self.assertCountEqual(
            response.json["resources"].keys(), ["nodes", "cores", "memory", "gpus"]
        )
        self.assertEqual(response.json["resources"]["nodes"], len(nodes_asset))
        self.assertEqual(
            response.json["resources"]["cores"],
            sum([node["cpus"] for node in nodes_asset]),
        )
        self.assertEqual(
            response.json["resources"]["memory"],
            sum([node["real_memory"] for node in nodes_asset]),
        )
        self.assertEqual(
            response.json["resources"]["gpus"],
            sum(
                [
                    self.app.slurmrestd.node_gres_extract_gpus(node["gres"])
                    for node in nodes_asset
                ]
            ),
        )

    @all_slurm_api_versions
    def test_request_partitions(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [partitions_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-partitions", "partitions")],
        )
        response = self.client.get(f"/v{get_version()}/partitions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(partitions_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], partitions_asset[idx]["name"])

    @all_slurm_api_versions
    def test_request_qos(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [qos_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-qos", "qos")],
        )
        response = self.client.get(f"/v{get_version()}/qos")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(qos_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], qos_asset[idx]["name"])

    @all_slurm_api_versions
    def test_request_reservations(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [reservations_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-reservations", "reservations")],
        )
        response = self.client.get(f"/v{get_version()}/reservations")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(reservations_asset))
        for idx in range(len(response.json)):
            self.assertEqual(
                response.json[idx]["name"], reservations_asset[idx]["name"]
            )

    @all_slurm_api_versions
    def test_request_accounts(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [accounts_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-accounts", "accounts")],
        )
        response = self.client.get(f"/v{get_version()}/accounts")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)
        self.assertEqual(len(response.json), len(accounts_asset))
        for idx in range(len(response.json)):
            self.assertEqual(response.json[idx]["name"], accounts_asset[idx]["name"])

    def test_cache_stats_disabled(self):
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            response = self.client.get(f"/v{get_version()}/cache/stats")
        self.assertEqual(response.status_code, 501)
        self.assertEqual(
            response.json,
            {
                "code": 501,
                "description": (
                    "Cache service is disabled, unable to query cache statistics"
                ),
                "name": "Not Implemented",
            },
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.views.agent:Cache service is disabled, unable to "
                "query cache statistics"
            ],
        )

    def test_cache_stats(self):
        self.app.cache = mock.Mock(spec=CachingService)
        self.app.cache.metrics.return_value = (
            {"jobs": 10, "nodes": 5},
            {"jobs": 8, "nodes": 3},
            15,
            11,
        )
        response = self.client.get(f"/v{get_version()}/cache/stats")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {
                "hit": {"keys": {"jobs": 10, "nodes": 5}, "total": 15},
                "miss": {"keys": {"jobs": 8, "nodes": 3}, "total": 11},
            },
        )

    def test_cache_reset_disabled(self):
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            response = self.client.post(f"/v{get_version()}/cache/reset")
        self.assertEqual(response.status_code, 501)
        self.assertEqual(
            response.json,
            {
                "code": 501,
                "description": ("Cache service is disabled, unable to reset cache"),
                "name": "Not Implemented",
            },
        )
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.views.agent:Cache service is disabled, unable to "
                "reset cache"
            ],
        )

    def test_cache_reset(self):
        self.app.cache = mock.Mock(spec=CachingService)
        self.app.cache.metrics.return_value = (
            {"jobs": 0},
            {"jobs": 0},
            0,
            0,
        )
        response = self.client.post(f"/v{get_version()}/cache/reset")
        self.assertEqual(response.status_code, 200)
        # Ensure reset() was called before metrics()
        self.app.cache.reset.assert_called_once()
        self.app.cache.metrics.assert_called_once()
        self.assertEqual(
            response.json,
            {
                "hit": {"keys": {"jobs": 0}, "total": 0},
                "miss": {"keys": {"jobs": 0}, "total": 0},
            },
        )

    def test_request_metrics(self):
        # Metrics feature is disabled in this test case, check that the corresponding
        # endpoint returns HTTP/404 (not found).
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 404)
