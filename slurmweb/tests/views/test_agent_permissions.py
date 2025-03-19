# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.version import get_version

from ..lib.agent import TestAgentBase
from ..lib.utils import any_slurm_version


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

    def test_permissions_anonymous_disabled(self):
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

    def test_permissions_no_token(self):
        # permissions endpoint is guarded by @check_jwt decorator that must reply 403
        # to requests without bearer token.
        self.setup_client(use_token=False)
        self.assertTrue(self.app.policy.allow_anonymous)
        response = self.client.get(f"/v{get_version()}/permissions")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": "Not allowed to access endpoint without bearer token",
                "name": "Forbidden",
            },
        )

    @any_slurm_version
    def test_action_anonymous_ok(self, slurm_version):
        # stats endpoint is authorized to anonymous role in default policy.
        self.setup_client(anonymous_user=True)
        [ping_asset, jobs_asset, nodes_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            [
                ("slurm-ping", "meta"),
                ("slurm-jobs", "jobs"),
                ("slurm-nodes", "nodes"),
            ],
        )
        response = self.client.get(f"/v{get_version()}/stats")
        self.assertEqual(response.status_code, 200)
        self.assertIn("jobs", response.json)

    def test_action_anonymous_disabled(self):
        # stats endpoint must be denied to anonymous tokens when anonymous role is
        # disabled in policy.
        self.setup_client(anonymous_enabled=False, anonymous_user=True)
        response = self.client.get(f"/v{get_version()}/stats")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": (
                    "Anonymous role is not allowed to perform action view-stats"
                ),
                "name": "Forbidden",
            },
        )

    def test_action_no_token_denied(self):
        # stats endpoint must be denied to requests without bearer token.
        self.setup_client(use_token=False)
        response = self.client.get(f"/v{get_version()}/stats")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": ("Not allowed to access endpoint without bearer token"),
                "name": "Forbidden",
            },
        )

    def test_action_anonymous_denied(self):
        # Test agent permission denied with @rbac_action decorator by calling /accounts
        # without authentication token, ie. as anonymous who is denied to access this
        # route in Slurm-web default authorization policy.
        self.setup_client(anonymous_user=True)
        response = self.client.get(f"/v{get_version()}/accounts")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": (
                    "Anonymous role is not allowed to perform action view-accounts"
                ),
                "name": "Forbidden",
            },
        )

    def test_invalid_token(self):
        self.setup_client()
        self.client.environ_base["HTTP_AUTHORIZATION"] = "Bearer failed"
        response = self.client.get(f"/v{get_version()}/jobs")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json,
            {
                "code": 401,
                "description": "Unable to decode token: Not enough segments",
                "name": "Unauthorized",
            },
        )
