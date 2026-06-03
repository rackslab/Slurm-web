# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import urllib

from slurmweb.slurmrestd import SlurmrestdFiltered
from slurmweb.slurmrestd import TERMINAL_JOB_STATES
from ..lib.utils import SlurmwebAssetUnavailable, all_slurm_api_versions
from ..lib.slurmrestd import (
    TestSlurmrestdBase,
    basic_authentifier,
    LATEST_SUPPORTED_SLURMRESTD_API_VERSION,
)


class TestSlurmrestdFiltered(TestSlurmrestdBase):
    def setUp(self):
        self.settings = self.load_agent_settings_definition()
        self.slurmrestd = SlurmrestdFiltered(
            urllib.parse.urlparse("unix:///dev/null"),
            basic_authentifier(),
            [LATEST_SUPPORTED_SLURMRESTD_API_VERSION],
            self.settings.filters,
        )

    @all_slurm_api_versions
    def test_jobs(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-jobs", "jobs")],
        )
        jobs = self.slurmrestd.jobs()
        for idx in range(len(jobs)):
            # Check there are less keys for the 1st item in result than in original
            # asset.
            self.assertLess(len(jobs[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(jobs[idx]["job_id"], asset[idx]["job_id"])
            self.assertEqual(jobs[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("accrue_time", asset[idx])
            self.assertNotIn("accrue_time", jobs[idx])

    @all_slurm_api_versions
    def test_job(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [slurmdb_asset, slurm_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-running", "jobs"), ("slurm-job-running", "jobs")],
        )
        job = self.slurmrestd.job(1)
        # Check there are less keys for the item in result than in original asset.
        self.assertLess(len(job.keys()), len(slurm_asset[0].keys()))
        self.assertEqual(job["time"], slurmdb_asset[0]["time"])
        # Check arbitrary key has been filtered out.
        self.assertIn("array_job_id", slurm_asset[0])
        self.assertNotIn("array_job_id", job)

    @all_slurm_api_versions
    def test_nodes(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-nodes", "nodes")],
        )
        nodes = self.slurmrestd.nodes()
        for idx in range(len(nodes)):
            # Check there are less keys for the 1st item in result than in original
            # asset.
            self.assertLess(len(nodes[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(nodes[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("specialized_cpus", asset[idx])
            self.assertNotIn("specialized_cpus", nodes[idx])

    @all_slurm_api_versions
    def test_node(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-node-idle", "nodes")],
        )
        node = self.slurmrestd.node("node1")
        # Check there are less keys for the item in result than in original asset.
        self.assertLess(len(node.keys()), len(asset[0].keys()))
        self.assertEqual(node["name"], asset[0]["name"])
        # Check arbitrary key has been filtered out.
        self.assertIn("specialized_cpus", asset[0])
        self.assertNotIn("specialized_cpus", node)

    @all_slurm_api_versions
    def test_partitions(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-partitions", "partitions")],
        )
        partitions = self.slurmrestd.partitions()
        for idx in range(len(partitions)):
            # Check there are less keys for the 1st item in result than in original
            # asset.
            self.assertLess(len(partitions[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(partitions[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("suspend_time", asset[idx])
            self.assertNotIn("suspend_time", partitions[idx])

    @all_slurm_api_versions
    def test_accounts(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-accounts", "accounts")],
        )
        accounts = self.slurmrestd.accounts()
        for idx in range(len(accounts)):
            # Check there are less keys for the 1st item in result than in original
            # asset.
            self.assertLess(len(accounts[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(accounts[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("flags", asset[idx])
            self.assertNotIn("flags", accounts[idx])

    @all_slurm_api_versions
    def test_reservations(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-reservations", "reservations")],
        )
        reservations = self.slurmrestd.reservations()
        for idx in range(len(reservations)):
            # Check there are less keys for the 1st item in result than in original
            # asset.
            self.assertLess(len(reservations[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(reservations[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("core_specializations", asset[idx])
            self.assertNotIn("core_specializations", reservations[idx])

    @all_slurm_api_versions
    def test_qos(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-qos", "qos")],
        )
        qos = self.slurmrestd.qos()
        for idx in range(len(qos)):
            # Check there are less keys for the 1st item in result than in original
            # asset.
            self.assertLess(len(qos[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(qos[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("usage_threshold", asset[idx])
            self.assertNotIn("usage_threshold", qos[idx])

    @all_slurm_api_versions
    def test_jobs_exclude_terminal(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        [asset] = self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-jobs", "jobs")],
        )
        jobs = self.slurmrestd.jobs_current()
        for job in jobs:
            self.assertFalse(
                any(state in TERMINAL_JOB_STATES for state in job.get("job_state", [])),
                f"job {job['job_id']} should not be terminal",
            )
        terminal_in_asset = sum(
            1
            for job in asset
            if any(state in TERMINAL_JOB_STATES for state in job.get("job_state", []))
        )
        self.assertGreater(terminal_in_asset, 0)

    @all_slurm_api_versions
    def test_past_jobs(self, slurm_version, api_version):
        self.setup_slurmrestd(slurm_version, api_version)
        try:
            self.mock_slurmrestd_responses(
                slurm_version,
                api_version,
                [("slurmdb-jobs", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            self.skipTest(
                f"slurmdb-jobs asset missing for {slurm_version} API {api_version}"
            )
        result = self.slurmrestd.jobs_past(6)
        self.assertGreater(len(result), 0)
        job = result[0]
        self.assertIn("name", job)
        self.assertNotIn("steps", job)
        self.assertNotIn("allocation_nodes", job)
        self.assertIn("user", job)
        self.assertIn("state", job)
        self.assertIn("tres", job)
        self.assertNotIn("used_gres", job)
        self.assertNotIn("user_name", job)
        for past_job in result:
            for state in past_job.get("state", {}).get("current", []):
                self.assertIn(state, TERMINAL_JOB_STATES)
