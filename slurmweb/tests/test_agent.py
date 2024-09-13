# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


import unittest
from unittest import mock
import tempfile
import os

from flask import Blueprint

from slurmweb.version import get_version
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.agent import SlurmwebAppAgent

CONF = """
[service]
cluster=test

[jwt]
key={key}

[policy]
definition={policy_defs}
vendor_roles={policy}
"""


class FakeRacksDBWebBlueprint(Blueprint):
    """Fake RacksDB web blueprint to avoid testing RacksDB in the scope of
    Slurm-web test cases."""

    def __init__(self, **kwargs):
        super().__init__("Fake RacksDB web blueprint", __name__)


class TestAgent(unittest.TestCase):
    def setUp(self):
        # Generate JWT signing key
        key = tempfile.NamedTemporaryFile(mode="w+")
        key.write("hey")
        key.seek(0)

        vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "conf", "vendor"
        )

        # Policy definition path
        policy_defs = os.path.join(vendor_path, "policy.yml")

        # Policy path
        policy = os.path.join(vendor_path, "policy.ini")

        # Generate configuration file
        conf = tempfile.NamedTemporaryFile(mode="w+")
        conf.write(CONF.format(key=key.name, policy_defs=policy_defs, policy=policy))
        conf.seek(0)

        # Configuration definition path
        conf_defs = os.path.join(vendor_path, "agent.yml")

        # Start the app with mocked RacksDB web blueprint
        with mock.patch("slurmweb.apps.agent.RacksDBWebBlueprint") as m:
            m.return_value = FakeRacksDBWebBlueprint()
            self.app = SlurmwebAppAgent(
                SlurmwebConfSeed(
                    debug=False,
                    log_flags=["ALL"],
                    debug_flags=[],
                    conf_defs=conf_defs,
                    conf=conf.name,
                )
            )
        conf.close()
        key.close()
        self.app.config.update(
            {
                "TESTING": True,
            }
        )
        self.client = self.app.test_client()

    def test_version(self):
        response = self.client.get("/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web agent v{get_version()}\n")

    def test_info(self):
        response = self.client.get(f"/v{get_version()}/info")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 1)
        self.assertIn("cluster", response.json)
        self.assertEqual(response.json["cluster"], "test")

    def test_permissions(self):
        response = self.client.get(f"/v{get_version()}/permissions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 2)
        self.assertIn("actions", response.json)
        self.assertIn("roles", response.json)
        self.assertCountEqual(response.json["roles"], ["user", "anonymous"])

    def test_request_jobs(self):
        self.client.get(f"/v{get_version()}/jobs")
        # slurmrestd should be mocked to avoid Unable to connect error
        # self.assertEqual(response.json, "")
