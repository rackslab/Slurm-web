# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from ...lib.gateway import TestGatewayBase


class TestGatewayAnonymous(TestGatewayBase):
    def test_anonymous_login_success(self):
        self.setup_app_with_anonymous()
        response = self.client.get("/api/anonymous")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["result"], "Successful anonymous access")
        self.assertIn("token", response.json)

    @patch("rfl.authentication.ldap.LDAPAuthentifier")
    def test_anonymous_rejected_when_auth_enabled(self, mock_ldap_cls):
        self.setup_app_with_anonymous(ldap=True)
        response = self.client.get("/api/anonymous")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["description"], "Unauthorized anonymous access")
