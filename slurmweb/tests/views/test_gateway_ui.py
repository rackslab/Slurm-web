# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from slurmweb.version import get_version

from ..lib.gateway import TestGatewayBase
from ..lib.oidc import skip_unless_oidc


class TestGatewayUI(TestGatewayBase):
    def test_ui_config_with_ui_enabled(self):
        """Test /config.json endpoint when UI is enabled."""
        self.setup_app_with_ui(ui_enabled=True, host="http://localhost:5011/")

        response = self.client.get("/config.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {
                "API_SERVER": "http://localhost:5011/",
                "AUTHENTICATION": False,
                "RACKSDB_RACKS_LABELS": False,
                "RACKSDB_ROWS_LABELS": False,
                "VERSION": get_version(),
            },
        )

    def test_ui_config_with_ui_enabled_prefix(self):
        """Test /config.json endpoint when UI is enabled with prefix."""
        self.setup_app_with_ui(ui_enabled=True, host="http://localhost:5011/slurm-web")

        response = self.client.get("/slurm-web/config.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {
                "API_SERVER": "http://localhost:5011/slurm-web",
                "AUTHENTICATION": False,
                "RACKSDB_RACKS_LABELS": False,
                "RACKSDB_ROWS_LABELS": False,
                "VERSION": get_version(),
            },
        )

    def test_ui_config_with_ui_disabled(self):
        """Test /config.json endpoint when UI is disabled."""
        self.setup_app_with_ui(ui_enabled=False)

        # When UI is disabled, the /config.json route is not registered
        response = self.client.get("/config.json")
        self.assertEqual(response.status_code, 404)

    @patch("rfl.authentication.ldap.LDAPAuthentifier")
    def test_ui_config_exposes_ldap_method(self, mock_ldap_cls):
        """Test /config.json exposes LDAP authentication method when UI is enabled."""
        self.setup_app_with_ldap(ui_enabled=True)
        response = self.client.get("/config.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["AUTHENTICATION_METHOD"], "ldap")

    @skip_unless_oidc
    @patch("rfl.authentication.oidc.OIDCClient")
    def test_ui_config_exposes_oidc_method(self, mock_oidc_cls):
        """Test /config.json exposes OIDC authentication method when UI is enabled."""
        self.setup_app_with_oidc(ui_enabled=True)
        response = self.client.get("/config.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["AUTHENTICATION_METHOD"], "oidc")
