# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
from unittest import mock

from ..lib.agent import TestAgentBase, is_racksdb_available
from ..lib.utils import flask_404_description


@unittest.skipIf(not is_racksdb_available(), "RacksDB not installed")
class TestAgentRacksDBEnabledRequest(TestAgentBase):
    def setUp(self):
        self.setup_client()

    def test_request_racksdb(self):
        # Check FakeRacksDBWebBlueprint is called in auto mode (enabled omitted).
        response = self.client.get("/racksdb/fake")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {"test": "ok"},
        )


@unittest.skipIf(not is_racksdb_available(), "RacksDB not installed")
class TestAgentRacksDBUnabledRequest(TestAgentBase):
    def setUp(self):
        self.setup_client(racksdb_format_error=True)

    def test_request_racksdb(self):
        # Check FakeRacksDBWebBlueprint is not registered when racksdb is unable to load
        # database.
        response = self.client.get("/racksdb/fake")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": flask_404_description,
                "name": "Not Found",
            },
        )


class TestAgentRacksDBDisabledRequest(TestAgentBase):
    @mock.patch("racksdb.web.app.RacksDBWebBlueprint")
    def test_request_racksdb(self, mock_blueprint):
        self.setup_client(racksdb=False)
        mock_blueprint.assert_not_called()
        response = self.client.get("/racksdb/fake")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json,
            {
                "code": 404,
                "description": flask_404_description,
                "name": "Not Found",
            },
        )
