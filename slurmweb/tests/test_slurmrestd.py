# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
from pathlib import Path
import os

import requests

from rfl.settings import RuntimeSettings
from slurmweb.slurmrestd import Slurmrestd, SlurmrestdFiltered
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdInternalError,
    SlurmrestdInvalidResponseError,
    SlurmrestdNotFoundError,
)

from .utils import (
    all_slurm_versions,
    SlurmwebAssetUnavailable,
    mock_slurmrestd_responses,
)


class TestSlurmrestdBase(unittest.TestCase):

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.slurmrestd, slurm_version, assets)


class TestSlurmrestd(TestSlurmrestdBase):
    def setUp(self):
        self.slurmrestd = Slurmrestd(Path("/dev/null"), "1.0.0")

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.slurmrestd, slurm_version, assets)

    @all_slurm_versions
    def test_request(self, slurm_version):
        # We can use basically any successful asset such as slurm-jobs for this test.
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        response = self.slurmrestd._request("/whatever", key="jobs")
        self.assertEqual(response, asset)

    def test_request_connection_error(self):
        self.slurmrestd.session.get = mock.Mock(
            side_effect=requests.exceptions.ConnectionError("test connection error")
        )
        with self.assertRaisesRegex(
            SlurmrestConnectionError,
            "^test connection error$",
        ):
            self.slurmrestd._request("/whatever", key="whatever")

    @all_slurm_versions
    def test_request_slurm_internal_error(self, slurm_version):
        # We can use slurm-node-unfound asset for this test.
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-unfound", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(
            SlurmrestdInternalError,
            r"^SlurwebRestdError\(slurmrestd undefined error, -1, Failure to query "
            r"node unexisting-node, _dump_nodes\)$",
        ):
            self.slurmrestd._request("/whatever", key="whatever")

    def test_request_slurm_invalid_content_type(self):
        fake_response = requests.Response()
        fake_response.headers = {"content-type": "text/plain"}
        fake_response.json = lambda: "whatever"
        self.slurmrestd.session.get = mock.Mock(return_value=fake_response)

        with self.assertRaisesRegex(
            SlurmrestdInvalidResponseError,
            "^Unsupported Content-Type for slurmrestd response None: text/plain$",
        ):
            self.slurmrestd._request("/whatever", key="whatever")

    @all_slurm_versions
    def test_request_slurm_not_found(self, slurm_version):
        # We can use slurm-not-found asset for this test.
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-not-found", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(SlurmrestdNotFoundError, "^/mocked/query$"):
            self.slurmrestd._request("/whatever", key="whatever")

    @all_slurm_versions
    def test_version(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-ping", "meta")]
            )
        except SlurmwebAssetUnavailable:
            return

        version = self.slurmrestd.version()
        self.assertCountEqual(version, asset["Slurm"])

    @all_slurm_versions
    def test_jobs(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return

        jobs = self.slurmrestd.jobs()
        self.assertCountEqual(jobs, asset)

    @all_slurm_versions
    def test_nodes(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-nodes", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return

        nodes = self.slurmrestd.nodes()
        self.assertCountEqual(nodes, asset)

    @all_slurm_versions
    def test_node(self, slurm_version):
        # We can use slurm-node-allocated asset for this test.
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-allocated", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return

        node = self.slurmrestd.node("node1")
        self.assertCountEqual(node, asset[0])

    @all_slurm_versions
    def test_node_not_found(self, slurm_version):
        # We can use slurm-node-unfound asset for this test.
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-unfound", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(
            SlurmrestdNotFoundError, "^Node unknown not found$"
        ):
            self.slurmrestd.node("unknown")

    @all_slurm_versions
    def test_partitions(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-partitions", "partitions")]
            )
        except SlurmwebAssetUnavailable:
            return

        partitions = self.slurmrestd.partitions()
        self.assertCountEqual(partitions, asset)

    @all_slurm_versions
    def test_accounts(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-accounts", "accounts")]
            )
        except SlurmwebAssetUnavailable:
            return

        accounts = self.slurmrestd.accounts()
        self.assertCountEqual(accounts, asset)

    @all_slurm_versions
    def test_reservations(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-reservations", "reservations")]
            )
        except SlurmwebAssetUnavailable:
            return

        reservations = self.slurmrestd.reservations()
        self.assertCountEqual(reservations, asset)

    @all_slurm_versions
    def test_qos(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-qos", "qos")]
            )
        except SlurmwebAssetUnavailable:
            return

        qos = self.slurmrestd.qos()
        self.assertCountEqual(qos, asset)


class TestSlurmrestdFiltered(TestSlurmrestdBase):
    def setUp(self):
        self.settings = RuntimeSettings.yaml_definition(
            os.path.join(
                os.path.dirname(__file__), "..", "..", "conf", "vendor", "agent.yml"
            )
        )
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
        print(slurm_asset)
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
