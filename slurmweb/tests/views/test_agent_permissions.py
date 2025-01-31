# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.version import get_version

from ..lib.agent import TestAgentBase


class TestAgentPermissions(TestAgentBase):

    def test_permissions_user(self):
        self.setup_client()
        response = self.client.get(f"/v{get_version()}/permissions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 2)
        self.assertIn("actions", response.json)
        self.assertIn("roles", response.json)
        self.assertCountEqual(response.json["roles"], ["user"])
        self.assertCountEqual(
            response.json["actions"], self.app.policy.roles_actions(self.user)[1]
        )

    def test_permissions_anonymous(self):
        self.setup_client(anonymous_user=True)
        self.assertTrue(self.app.policy.allow_anonymous)
        response = self.client.get(f"/v{get_version()}/permissions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 2)
        self.assertIn("actions", response.json)
        self.assertIn("roles", response.json)
        # anonymous user should get the anonymous role and corresponding set of actions
        # when anonymous mode is enabled in policy.
        self.assertCountEqual(response.json["roles"], ["anonymous"])
        self.assertCountEqual(
            response.json["actions"], self.app.policy.roles_actions(self.user)[1]
        )

    def test_permissions_anonymous_forbidden(self):
        self.setup_client(anonymous_user=True, anonymous_enabled=False)
        self.assertFalse(self.app.policy.allow_anonymous)
        response = self.client.get(f"/v{get_version()}/permissions")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertEqual(len(response.json.keys()), 2)
        self.assertIn("actions", response.json)
        self.assertIn("roles", response.json)
        # anonymous user should get no role or action when anonymous mode is disabled in
        # policy.
        self.assertCountEqual(response.json["roles"], [])
        self.assertCountEqual(response.json["actions"], [])
