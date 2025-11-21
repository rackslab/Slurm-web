# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import tempfile
import shutil

from slurmweb.version import get_version

from ..lib.gateway import TestGatewayBase


class TestGatewayUI(TestGatewayBase):
    def setup_app_with_ui(self, ui_enabled=True, host=None):
        """Set up gateway app with UI enabled or disabled."""
        conf_overrides = {"ui_enabled": ui_enabled}
        ui_dir = None
        if ui_enabled:
            ui_dir = tempfile.mkdtemp()
            self.addCleanup(lambda: shutil.rmtree(ui_dir, ignore_errors=True))
            conf_overrides.update(
                {
                    "ui_host": host or "http://localhost:5011/",
                    "ui_path": ui_dir,
                }
            )

        self.setup_app(conf_overrides=conf_overrides)

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
