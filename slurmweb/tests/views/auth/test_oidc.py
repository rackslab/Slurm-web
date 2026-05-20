# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch
from urllib.parse import urlparse

from flask import redirect

from rfl.authentication.errors import OIDCAuthenticationError
from rfl.authentication.user import AuthenticatedUser

from ...lib.gateway import TestGatewayBase
from ...lib.oidc import skip_unless_oidc


@skip_unless_oidc
class TestGatewayOIDC(TestGatewayBase):
    @patch("rfl.authentication.oidc.OIDCClient")
    def test_oidc_login_redirect(self, mock_oidc_cls):
        self.setup_app_with_oidc()
        mock_oidc_cls.return_value.redirect.return_value = redirect(
            "https://idp.example.com/authorize"
        )
        response = self.client.get("/api/oidc/login")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.location, "https://idp.example.com/authorize")
        mock_oidc_cls.return_value.redirect.assert_called_once()

    @patch("rfl.authentication.oidc.OIDCClient")
    def test_oidc_login_authentication_error(self, mock_oidc_cls):
        self.setup_app_with_oidc()
        mock_oidc_cls.return_value.redirect.side_effect = OIDCAuthenticationError(
            "OIDC authorization redirect failed: mismatching_state"
        )
        response = self.client.get("/api/oidc/login")
        self.assertEqual(response.status_code, 401)

    @patch("rfl.authentication.ldap.LDAPAuthentifier")
    @patch("rfl.authentication.oidc.OIDCClient")
    def test_oidc_login_rejected_when_not_oidc(self, mock_oidc_cls, mock_ldap_cls):
        self.setup_app_with_ldap()
        response = self.client.get("/api/oidc/login")
        self.assertEqual(response.status_code, 501)
        self.assertEqual(
            response.json["description"], "OIDC authentication is not enabled"
        )

    @patch("rfl.authentication.oidc.OIDCClient")
    def test_oidc_callback_and_session(self, mock_oidc_cls):
        self.setup_app_with_oidc(ui_host="http://localhost/", ui_enabled=True)
        mock_oidc_cls.return_value.redirect.return_value = redirect(
            "https://idp.example.com/authorize"
        )
        mock_oidc_cls.return_value.authenticate.return_value = AuthenticatedUser(
            login="alice",
            fullname="Alice User",
            groups=["admins"],
        )

        self.client.get("/api/oidc/login")
        callback_response = self.client.get(
            "/api/oidc/callback?code=abc&state=state-1",
        )
        self.assertEqual(callback_response.status_code, 302)
        # Older Flask/Werkzeug (eg. el9 RPM) absolutize relative redirect targets. Parse
        # the URL to check its path only.
        self.assertEqual(
            urlparse(callback_response.location).path,
            "/auth/oidc/callback",
        )

        session_response = self.client.get("/api/oidc/session")
        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.json["login"], "alice")
        self.assertEqual(session_response.json["fullname"], "Alice User")
        self.assertEqual(session_response.json["groups"], ["admins"])
        self.assertIn("token", session_response.json)

        missing_session = self.client.get("/api/oidc/session")
        self.assertEqual(missing_session.status_code, 401)

    @patch("rfl.authentication.oidc.OIDCClient")
    def test_oidc_callback_authentication_error(self, mock_oidc_cls):
        self.setup_app_with_oidc()
        mock_oidc_cls.return_value.authenticate.side_effect = OIDCAuthenticationError(
            "invalid state"
        )
        response = self.client.get("/api/oidc/callback?code=abc&state=state-1")
        self.assertEqual(response.status_code, 401)
