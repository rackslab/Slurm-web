# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from unittest import mock
import random
import urllib

import requests
import ClusterShell

from slurmweb.slurmrestd import Slurmrestd
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdAuthenticationError,
    SlurmrestdInternalError,
    SlurmrestdInvalidResponseError,
    SlurmrestdNotFoundError,
)
from ..lib.utils import (
    all_slurm_versions,
    SlurmwebAssetUnavailable,
    mock_slurmrestd_responses,
)
from ..lib.slurmrestd import TestSlurmrestdBase, basic_authentifier


class TestSlurmrestd(TestSlurmrestdBase):
    def setUp(self):
        self.slurmrestd = Slurmrestd(
            urllib.parse.urlparse("unix:///dev/null"),
            basic_authentifier(),
            "1.0.0",
        )

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
            self.mock_slurmrestd_responses(
                slurm_version, [("slurm-node-unfound", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(
            SlurmrestdInternalError,
            r"^SlurwebRestdError\(No error, 0, Failure to query node unexisting-node, "
            r"_dump_nodes\)$",
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
    def test_request_slurm_jwt_missing_headers(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jwt-missing-headers", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(SlurmrestdAuthenticationError, "^/mocked/query$"):
            self.slurmrestd._request("/whatever", key="whatever")

    @all_slurm_versions
    def test_request_slurm_jwt_invalid_headers(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jwt-invalid-headers", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(SlurmrestdAuthenticationError, "^/mocked/query$"):
            self.slurmrestd._request("/whatever", key="whatever")

    @all_slurm_versions
    def test_request_slurm_jwt_invalid_token(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jwt-invalid-token", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(
            SlurmrestdInternalError, r"^SlurwebRestdError\(.*\)$"
        ):
            self.slurmrestd._request("/whatever", key="whatever")

    @all_slurm_versions
    def test_request_slurm_jwt_expired_token(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jwt-expired-token", None)]
            )
        except SlurmwebAssetUnavailable:
            return

        with self.assertRaisesRegex(
            SlurmrestdInternalError, r"^SlurwebRestdError\(.*\)$"
        ):
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

        def terminated(job):
            for terminated_state in ["COMPLETED", "FAILED", "TIMEOUT"]:
                if terminated_state in job["job_state"]:
                    return True
            return False

        # Select random busy node on cluster
        busy_nodes = ClusterShell.NodeSet.NodeSet()
        for job in asset:
            if not terminated(job):
                busy_nodes.update(job["nodes"])
        random_busy_node = random.choice(busy_nodes)

        jobs = self.slurmrestd.jobs_by_node(random_busy_node)

        # Check we have results in list but less that full list of jobs.
        self.assertIsInstance(jobs, list)
        self.assertNotEqual(len(jobs), 0)
        self.assertLess(len(jobs), len(asset))

        # Check all jobs are not completed and have the random busy node allocated.
        for job in jobs:
            self.assertNotIn(job["job_state"], ["COMPLETED", "FAILED", "TIMEOUT"])
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

    def test_node_gres_extract_gpus(self):
        self.assertEqual(self.slurmrestd.node_gres_extract_gpus(""), 0)
        self.assertEqual(self.slurmrestd.node_gres_extract_gpus("gpu:2"), 2)
        self.assertEqual(self.slurmrestd.node_gres_extract_gpus("gpu:0"), 0)
        self.assertEqual(self.slurmrestd.node_gres_extract_gpus("gpu:tesla:1"), 1)
        self.assertEqual(self.slurmrestd.node_gres_extract_gpus("gpu:nvidia:4"), 4)
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus("lustre:whamcloud:10"), 0
        )
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus("gpu:tesla:3,gpu:nvidia:1"), 4
        )
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus("lustre:ddn:4,gpu:nvidia:2"), 2
        )
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus("gpu:h100:0(IDX:N/A)"), 0
        )
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus("gpu:h100:4(IDX:0-3)"), 4
        )
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus(
                "gpu:h100:1(IDX:0),gpu:h200:0(IDX:N/A)"
            ),
            1,
        )
        self.assertEqual(
            self.slurmrestd.node_gres_extract_gpus(
                "gpu:h100:2(IDX:0-1),gpu:h200:4(IDX:2-5)"
            ),
            6,
        )
