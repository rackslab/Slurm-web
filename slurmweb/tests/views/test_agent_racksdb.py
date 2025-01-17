# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


import textwrap

from ..lib.agent import TestAgentBase
from ..lib.utils import flask_404_description


class TestAgentRacksDBEnabledRequest(TestAgentBase):

    def setUp(self):
        self.setup_client()

    def test_request_racksdb(self):
        # Check FakeRacksDBWebBlueprint is called when racksdb is enabled (by default).
        response = self.client.get("/racksdb/fake")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {"test": "ok"},
        )


class TestAgentRacksDBDisabledRequest(TestAgentBase):

    def setUp(self):
        self.setup_client(
            additional_conf=textwrap.dedent(
                """

                [racksdb]
                enabled=no
                """
            )
        )

    def test_request_racksdb(self):
        # Check FakeRacksDBWebBlueprint is not registered when racksdb is disabled.
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
