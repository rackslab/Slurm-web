# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
from pathlib import Path
import random
import os

import requests
import ClusterShell

from rfl.settings import RuntimeSettings
from slurmweb.slurmrestd import Slurmrestd, SlurmrestdFiltered, SlurmrestdFilteredCached
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdInternalError,
    SlurmrestdInvalidResponseError,
    SlurmrestdNotFoundError,
)
from slurmweb.cache import CachingService
from slurmweb.errors import SlurmwebCacheError

from .utils import (
    all_slurm_versions,
    SlurmwebAssetUnavailable,
    mock_slurmrestd_responses,
)


class TestSlurmrestdBase(unittest.TestCase):

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.slurmrestd, slurm_version, assets)

    def load_agent_settings_definition(self):
        return RuntimeSettings.yaml_definition(
            os.path.join(
                os.path.dirname(__file__), "..", "..", "conf", "vendor", "agent.yml"
            )
        )


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
        self.assertCountEqual(version, asset["slurm"])

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
    def test_jobs_by_node(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return

        # Select random busy node on cluster
        busy_nodes = ClusterShell.NodeSet.NodeSet()
        for job in asset:
            if job["job_state"] != "COMPLETED":
                busy_nodes.update(job["nodes"])
        random_busy_node = random.choice(busy_nodes)

        jobs = self.slurmrestd.jobs_by_node(random_busy_node)

        # Check we have results in list but less that full list of jobs.
        self.assertIsInstance(jobs, list)
        self.assertNotEqual(len(jobs), 0)
        self.assertLess(len(jobs), len(asset))

        # Check all jobs are not completed and have the random busy node allocated.
        for job in jobs:
            self.assertNotEqual(job["job_state"], "COMPLETED")
            self.assertIn(
                random_busy_node,
                ClusterShell.NodeSet.NodeSet(job["nodes"]),
            )

        # Test get jobs on nonexistent node.
        jobs = self.slurmrestd.jobs_by_node("fail")
        self.assertEqual(jobs, [])

    @all_slurm_versions
    def test_jobs_states(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return

        jobs, total = self.slurmrestd.jobs_states()
        # Check total value matches the number of jobs in asset
        self.assertEqual(total, len(asset))

        # Check sum of jobs states matches the total number of jobs
        jobs_sum = 0
        for value in jobs.values():
            jobs_sum += value
        self.assertEqual(total, jobs_sum)
        self.assertEqual(jobs["unknown"], 0)

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
    def test_nodes_cores_states(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-nodes", "nodes")]
            )
        except SlurmwebAssetUnavailable:
            return

        nodes_states, cores_states, nodes_total, cores_total = (
            self.slurmrestd.nodes_cores_states()
        )
        # Check total number of nodes matches the number of nodes in asset
        self.assertEqual(nodes_total, len(asset))
        self.assertEqual(nodes_states["unknown"], 0)

        # Check sum of nodes states matches the total number of nodes
        nodes_sum = 0
        for value in nodes_states.values():
            nodes_sum += value
        self.assertEqual(nodes_total, nodes_sum)

        # Check sum of cores states matches the total number of cores
        cores_sum = 0
        for value in cores_states.values():
            cores_sum += value
        self.assertEqual(cores_total, cores_sum)
        self.assertEqual(cores_states["unknown"], 0)

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


class TestSlurmrestdFilteredCached(TestSlurmrestdBase):
    def setUp(self):
        self.settings = self.load_agent_settings_definition()
        self.settings.cache.enabled = True
        self.cache = CachingService(
            self.settings.cache.host,
            self.settings.cache.port,
            self.settings.cache.password,
        )
        self.slurmrestd = SlurmrestdFilteredCached(
            Path("/dev/null"),
            "1.0.0",
            self.settings.filters,
            self.settings.cache,
            self.cache,
        )

    @all_slurm_versions
    def test_not_in_cache(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        self.slurmrestd.service.get = mock.Mock(return_value=None)
        self.slurmrestd.service.put = mock.Mock()
        jobs = self.slurmrestd.jobs()
        for idx in range(len(jobs)):
            self.assertEqual(jobs[idx]["job_id"], asset[idx]["job_id"])
        # Check SlurmrestdFilteredCached has tried to get jobs from cache
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        # Check SlurmrestdFilteredCached has up jobs in cache with corresponding
        # expiration timeout.
        self.slurmrestd.service.put.assert_called_once_with(
            "jobs", jobs, self.settings.cache.jobs
        )

    @all_slurm_versions
    def test_in_cache(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        self.slurmrestd.service.get = mock.Mock(return_value=asset)
        self.slurmrestd.service.put = mock.Mock()
        jobs = self.slurmrestd.jobs()
        for idx in range(len(jobs)):
            self.assertEqual(jobs[idx]["job_id"], asset[idx]["job_id"])
        # Check SlurmrestdFilteredCached has tried to get jobs from cache.
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        # Check SlurmrestdFilteredCached has not put jobs again in cache.
        self.slurmrestd.service.put.assert_not_called()

    @all_slurm_versions
    def test_cache_get_error(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        # Check behaviour when SlurmwebCacheError in raised at get()
        self.slurmrestd.service.get = mock.Mock(
            side_effect=SlurmwebCacheError("fake cache error")
        )
        self.slurmrestd.service.put = mock.Mock()
        with self.assertRaisesRegex(SlurmwebCacheError, "^fake cache error$"):
            self.slurmrestd.jobs()
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        self.slurmrestd.service.put.assert_not_called()

    @all_slurm_versions
    def test_cache_put_error(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        # Check behaviour when SlurmwebCacheError in raised at put()
        self.slurmrestd.service.get = mock.Mock(return_value=None)
        self.slurmrestd.service.put = mock.Mock(
            side_effect=SlurmwebCacheError("fake cache error")
        )
        with self.assertRaisesRegex(SlurmwebCacheError, "^fake cache error$"):
            self.slurmrestd.jobs()
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        self.slurmrestd.service.put.assert_called_once()
