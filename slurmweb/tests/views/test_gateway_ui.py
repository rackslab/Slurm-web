# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import tempfile
from pathlib import Path
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

    def test_ui_config_exposes_branding(self):
        """Test /config.json exposes custom colors and logos when configured."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as logo_fh:
            logo_path = Path(logo_fh.name)
        logo_path.write_bytes(b"\x89PNG\r\n\x1a\ntest")
        self.addCleanup(lambda: logo_path.unlink())

        self.setup_app_with_ui(
            ui_enabled=True,
            host="http://localhost:5011/slurm-web",
            ui_color_main="#112233",
            ui_logo_login=str(logo_path),
            ui_logo_alt="Portal",
        )
        response = self.client.get("/slurm-web/config.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["COLOR_MAIN"], "#112233")
        self.assertEqual(
            response.json["LOGO_LOGIN"],
            "/slurm-web/logo/brand_login.png",
        )
        self.assertEqual(response.json["LOGO_ALT"], "Portal")

    def test_ui_logo_dev_ui_assets_dir(self):
        """Test custom logo served with SLURMWEB_DEV_UI_ASSETS_DIR env set."""
        import os
        import shutil

        from slurmweb.ui import SlurmwebFrontendEnvSettings

        assets_dir = Path(tempfile.mkdtemp(prefix="slurmweb-test-gateway-ui-"))
        self.addCleanup(lambda: shutil.rmtree(assets_dir, ignore_errors=True))
        os.environ[SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_ASSETS_DIR] = str(
            assets_dir
        )
        self.addCleanup(
            os.environ.pop,
            SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_ASSETS_DIR,
            None,
        )
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as logo_fh:
            logo_path = Path(logo_fh.name)
        logo_path.write_bytes(b"\x89PNG\r\n\x1a\ntest")
        self.addCleanup(lambda: logo_path.exists() and logo_path.unlink())

        self.setup_app_with_ui(
            ui_enabled=True,
            ui_logo_login=str(logo_path),
        )
        response = self.client.get("/logo/brand_login.png")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b"\x89PNG\r\n\x1a\ntest")
