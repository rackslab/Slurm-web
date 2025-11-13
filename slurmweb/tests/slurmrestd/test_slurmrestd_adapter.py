# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import urllib

from slurmweb.slurmrestd import SlurmrestdAdapter
from ..lib.utils import all_slurm_api_versions
from ..lib.slurmrestd import TestSlurmrestdBase, basic_authentifier


class TestSlurmrestdAdapter(TestSlurmrestdBase):
    def setUp(self):
        # Use SlurmrestdAdapter with latest version as target
        self.slurmrestd = SlurmrestdAdapter(
            urllib.parse.urlparse("unix:///dev/null"),
            basic_authentifier(),
            ["0.0.44", "0.0.43", "0.0.42", "0.0.41"],
        )

    def setup_slurmrestd(self, slurm_version, api_version):
        super().setup_slurmrestd(slurm_version, api_version)
        # Force discovery to build adaptation chain
        self.slurmrestd.discover()

    @all_slurm_api_versions
    def test_jobs(self, slurm_version, api_version):
        """Test that jobs() returns data with all expected fields after translation."""
        self.setup_slurmrestd(slurm_version, api_version)
        self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-jobs", "jobs")],
        )

        jobs = self.slurmrestd.jobs()

        # Check that jobs is a list
        self.assertIsInstance(jobs, list)
        self.assertGreater(len(jobs), 0)

        for job in jobs:
            # These fields should be present after AdapterV0_0_42 transformation
            self.assertIn("stderr_expanded", job)
            self.assertIn("stdin_expanded", job)
            self.assertIn("stdout_expanded", job)
            # Source fields should still be present
            self.assertIn("standard_error", job)
            self.assertIn("standard_input", job)
            self.assertIn("standard_output", job)

    @all_slurm_api_versions
    def test_qos(self, slurm_version, api_version):
        """Test that qos() returns data with all expected fields after translation."""
        self.setup_slurmrestd(slurm_version, api_version)
        self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurm-qos", "qos")],
        )

        qos_list = self.slurmrestd.qos()

        # Check that qos is a list
        self.assertIsInstance(qos_list, list)
        self.assertGreater(len(qos_list), 0)

        for qos in qos_list:
            # These fields should be present after AdapterV0_0_41 transformation
            self.assertIn("limits", qos)
            self.assertIn("max", qos["limits"])
            self.assertIn("count", qos["limits"]["max"]["jobs"])
            count = qos["limits"]["max"]["jobs"]["count"]
            self.assertIsInstance(count, dict)
            self.assertIn("infinite", count)
            self.assertIn("number", count)
            self.assertIn("set", count)

            self.assertIn("minutes", qos["limits"]["max"]["tres"])
            tres_minutes = qos["limits"]["max"]["tres"]["minutes"]
            self.assertIn("total", tres_minutes)
            self.assertIsInstance(tres_minutes["total"], list)

    @all_slurm_api_versions
    def test_job_slurmdb(self, slurm_version, api_version):
        """Test that slurmdb jobs have all expected fields after translation."""
        self.setup_slurmrestd(slurm_version, api_version)
        self.mock_slurmrestd_responses(
            slurm_version,
            api_version,
            [("slurmdb-job-running", "jobs")],
        )

        job = self.slurmrestd._acctjob(1)

        self.assertIsInstance(job["steps"], list)
        for step in job["steps"]:
            # These fields should be present after AdapterV0_0_42 transformation
            self.assertIn("step", step)
            self.assertIn("time", step)
            step_obj = step["step"]
            self.assertIn("stderr", step_obj)
            self.assertIn("stderr_expanded", step_obj)
            self.assertIn("stdin", step_obj)
            self.assertIn("stdin_expanded", step_obj)
            self.assertIn("stdout", step_obj)
            self.assertIn("stdout_expanded", step_obj)
            self.assertIn("limit", step["time"])
            limit = step["time"]["limit"]
            self.assertIsInstance(limit, dict)
            self.assertIn("set", limit)
            self.assertIn("infinite", limit)
            self.assertIn("number", limit)
