# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import urllib
from unittest import mock

from slurmweb.slurmrestd import SlurmrestdFiltered
from slurmweb.slurmrestd import TERMINAL_JOB_STATES
from slurmweb.slurmrestd.errors import SlurmrestdNotFoundError
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

    def test_job_multi_record_coherent(self):
        """A job-id mapping to many slurmdbd records (an unrelated terminated
        job that reused the id, plus an array task's preempted and current
        runs) must resolve to the live task's own accounting -- not the
        reused-id job, and not merely the newest record overall. _request is
        mocked directly (keyed on the component) to avoid version-specific
        fixtures."""
        acct = [
            {
                "job_id": 1,
                "array": {"task_id": {"set": False, "number": 0}},
                "time": {"start": {"number": 5000}},
                "state": {"current": ["FAILED"]},
            },
            {
                "job_id": 1,
                "array": {
                    "job_id": {"number": 1},
                    "task_id": {"set": True, "number": 5},
                },
                "time": {"start": {"number": 2000}},
                "state": {"current": ["PREEMPTED"]},
            },
            {
                "job_id": 1,
                "array": {
                    "job_id": {"number": 1},
                    "task_id": {"set": True, "number": 5},
                },
                "time": {"start": {"number": 3000}},
                "state": {"current": ["RUNNING"]},
            },
        ]
        ctld = [
            {
                "job_id": 1,
                "array_job_id": {"number": 1},
                "array_task_id": {"set": True, "number": 5},
                "start_time": {"number": 3000},
                "job_state": ["RUNNING"],
            }
        ]
        with mock.patch.object(
            self.slurmrestd,
            "_request",
            side_effect=lambda component, *a, **k: {"slurmdb": acct, "slurm": ctld}[
                component
            ],
        ):
            job = self.slurmrestd.job(1)
        # The accounting half is the current run of the live task (start 3000),
        # not the reused-id job (start 5000) nor the preempted run (start 2000).
        self.assertEqual(job["time"]["start"]["number"], 3000)

    def test_job_aged_out_of_slurmctld(self):
        """When the job is gone from slurmctld (empty list), job() returns the
        most recent accounting record without raising IndexError."""
        acct = [
            {
                "job_id": 2,
                "array": {"task_id": {"set": False, "number": 0}},
                "time": {"start": {"number": 1000}},
                "state": {"current": ["FAILED"]},
            },
            {
                "job_id": 2,
                "array": {"task_id": {"set": False, "number": 0}},
                "time": {"start": {"number": 2000}},
                "state": {"current": ["COMPLETED"]},
            },
        ]
        with mock.patch.object(
            self.slurmrestd,
            "_request",
            side_effect=lambda component, *a, **k: {"slurmdb": acct, "slurm": []}[
                component
            ],
        ):
            job = self.slurmrestd.job(2)
        self.assertEqual(job["time"]["start"]["number"], 2000)

    def test_job_not_found(self):
        """No records in either source -> SlurmrestdNotFoundError."""
        with mock.patch.object(
            self.slurmrestd,
            "_request",
            side_effect=lambda component, *a, **k: [],
        ):
            with self.assertRaises(SlurmrestdNotFoundError):
                self.slurmrestd.job(3)

    def test_job_without_accounting(self):
        """Accounting is optional: when the slurmdb query fails because the
        cluster has no slurmdbd, job detail is served from slurmctld alone
        instead of propagating the error."""
        ctld = [
            {
                "job_id": 4,
                "array_task_id": {"set": False, "number": 0},
                "start_time": {"number": 7000},
                "job_state": ["RUNNING"],
            }
        ]

        def fake(component, *args, **kwargs):
            if component == "slurmdb":
                raise SlurmrestdNotFoundError("no slurmdbd")
            return ctld

        with mock.patch.object(self.slurmrestd, "_request", side_effect=fake):
            job = self.slurmrestd.job(4)  # must not raise
        self.assertIsInstance(job, dict)

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
