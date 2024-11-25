# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from pathlib import Path

from slurmweb.slurmrestd import SlurmrestdFiltered

from ..lib.utils import (
    all_slurm_versions,
    SlurmwebAssetUnavailable,
)
from ..lib.slurmrestd import TestSlurmrestdBase


class TestSlurmrestdFiltered(TestSlurmrestdBase):
    def setUp(self):
        self.settings = self.load_agent_settings_definition()
        self.slurmrestd = SlurmrestdFiltered(
            Path("/dev/null"), "1.0.0", self.settings.filters
        )

    @all_slurm_versions
    def test_jobs(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        jobs = self.slurmrestd.jobs()
        for idx in range(len(jobs)):
            # Check there are less keys for the 1st item in result than in original asset.
            self.assertLess(len(jobs[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(jobs[idx]["job_id"], asset[idx]["job_id"])
            # Check arbitrary key has been filtered out.
            self.assertIn("accrue_time", asset[idx])
            self.assertNotIn("accrue_time", jobs[idx])

    @all_slurm_versions
    def test_job(self, slurm_version):
        try:
            [slurmdb_asset, slurm_asset] = self.mock_slurmrestd_responses(
                slurm_version,
                [("slurmdb-job-running", "jobs"), ("slurm-job-running", "jobs")],
            )
        except SlurmwebAssetUnavailable:
            return
        job = self.slurmrestd.job(1)
        # Check there are less keys for the item in result than in original asset.
        self.assertLess(len(job.keys()), len(slurm_asset[0].keys()))
        self.assertEqual(job["time"], slurmdb_asset[0]["time"])
        # Check arbitrary key has been filtered out.
        self.assertIn("array_job_id", slurm_asset[0])
        self.assertNotIn("array_job_id", job)

    @all_slurm_versions
    def test_nodes(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-nodes", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        nodes = self.slurmrestd.nodes()
        for idx in range(len(nodes)):
            # Check there are less keys for the 1st item in result than in original asset.
            self.assertLess(len(nodes[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(nodes[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("specialized_cpus", asset[idx])
            self.assertNotIn("specialized_cpus", nodes[idx])

    @all_slurm_versions
    def test_node(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-idle", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return
        node = self.slurmrestd.node("node1")
        # Check there are less keys for the item in result than in original asset.
        self.assertLess(len(node.keys()), len(asset[0].keys()))
        self.assertEqual(node["name"], asset[0]["name"])
        # Check arbitrary key has been filtered out.
        self.assertIn("specialized_cpus", asset[0])
        self.assertNotIn("specialized_cpus", node)

    @all_slurm_versions
    def test_partitions(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-partitions", "partitions")]
            )
        except SlurmwebAssetUnavailable:
            return
        partitions = self.slurmrestd.partitions()
        for idx in range(len(partitions)):
            # Check there are less keys for the 1st item in result than in original asset.
            self.assertLess(len(partitions[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(partitions[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("suspend_time", asset[idx])
            self.assertNotIn("suspend_time", partitions[idx])

    @all_slurm_versions
    def test_accounts(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-accounts", "accounts")]
            )
        except SlurmwebAssetUnavailable:
            return
        accounts = self.slurmrestd.accounts()
        for idx in range(len(accounts)):
            # Check there are less keys for the 1st item in result than in original asset.
            self.assertLess(len(accounts[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(accounts[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("flags", asset[idx])
            self.assertNotIn("flags", accounts[idx])

    @all_slurm_versions
    def test_reservations(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-reservations", "reservations")]
            )
        except SlurmwebAssetUnavailable:
            return
        reservations = self.slurmrestd.reservations()
        for idx in range(len(reservations)):
            # Check there are less keys for the 1st item in result than in original asset.
            self.assertLess(len(reservations[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(reservations[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("core_specializations", asset[idx])
            self.assertNotIn("core_specializations", reservations[idx])

    @all_slurm_versions
    def test_qos(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-qos", "qos")]
            )
        except SlurmwebAssetUnavailable:
            return
        qos = self.slurmrestd.qos()
        for idx in range(len(qos)):
            # Check there are less keys for the 1st item in result than in original asset.
            self.assertLess(len(qos[idx].keys()), len(asset[idx].keys()))
            self.assertEqual(qos[idx]["name"], asset[idx]["name"])
            # Check arbitrary key has been filtered out.
            self.assertIn("usage_threshold", asset[idx])
            self.assertNotIn("usage_threshold", qos[idx])
