# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import json
from unittest.mock import patch

from rfl.authentication.errors import LDAPAuthenticationError
from rfl.authentication.user import AuthenticatedUser

from ...lib.gateway import TestGatewayBase
from ...lib.oidc import skip_unless_oidc


class TestGatewayLDAP(TestGatewayBase):
    @patch("rfl.authentication.ldap.LDAPAuthentifier")
    def test_login_success(self, mock_ldap_cls):
        self.setup_app_with_ldap()
        mock_ldap_cls.return_value.login.return_value = AuthenticatedUser(
            login="alice",
            fullname="Alice User",
            groups=["admins"],
        )
        response = self.client.post(
            "/api/login",
            data=json.dumps({"user": "alice", "password": "secret"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["result"], "Authentication successful")
        self.assertEqual(response.json["login"], "alice")
        self.assertEqual(response.json["fullname"], "Alice User")
        self.assertEqual(response.json["groups"], ["admins"])
        self.assertIn("token", response.json)
        mock_ldap_cls.return_value.login.assert_called_once_with(
            user="alice", password="secret"
        )

    def test_login_rejected_when_auth_disabled(self):
        self.setup_app_with_anonymous()
        response = self.client.post(
            "/api/login",
            data=json.dumps({"user": "alice", "password": "secret"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json["description"], "Unable to authenticate")

    @skip_unless_oidc
    @patch("rfl.authentication.oidc.OIDCClient")
    def test_login_rejected_when_not_ldap(self, mock_oidc_cls):
        self.setup_app_with_oidc()
        response = self.client.post(
            "/api/login",
            data=json.dumps({"user": "alice", "password": "secret"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 501)
        self.assertEqual(
            response.json["description"], "LDAP authentication is not enabled"
        )

    @patch("rfl.authentication.ldap.LDAPAuthentifier")
    def test_login_ldap_authentication_error(self, mock_ldap_cls):
        self.setup_app_with_ldap()
        mock_ldap_cls.return_value.login.side_effect = LDAPAuthenticationError(
            "Invalid credentials"
        )
        response = self.client.post(
            "/api/login",
            data=json.dumps({"user": "alice", "password": "wrong"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["description"], "Invalid credentials")
