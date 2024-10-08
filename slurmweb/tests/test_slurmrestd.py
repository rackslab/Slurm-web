# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
from pathlib import Path

import requests

from slurmweb.slurmrestd import Slurmrestd
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


class TestSlurmrestd(unittest.TestCase):
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
