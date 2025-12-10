# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import sys
import unittest
from unittest import mock

from slurmweb.errors import SlurmwebConfigurationError

from ..lib.agent import TestAgentBase, is_racksdb_available


class TestAgentApp(TestAgentBase):
    def test_app_loaded(self):
        # No error log must be emitted in this case. Note that assertNoLogs is available
        # starting from Python 3.10. For versions below, absence of logs is not checked.
        if sys.version_info < (3, 10):
            self.setup_client()
        else:
            with self.assertNoLogs("slurmweb", level="ERROR"):
                self.setup_client()

    @unittest.skipIf(not is_racksdb_available(), "RacksDB not installed")
    def test_app_racksdb_format_error(self):
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            self.setup_client(racksdb_format_error=True)
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.agent:Unable to load RacksDB database: fake db "
                "format error"
            ],
        )

    @unittest.skipIf(not is_racksdb_available(), "RacksDB not installed")
    def test_app_racksdb_schema_error(self):
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            self.setup_client(racksdb_schema_error=True)
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.agent:Unable to load RacksDB schema: fake db "
                "schema error"
            ],
        )

    def test_app_slurmrestd_socket_deprecated(self):
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.setup_client(slurmrestd_parameters=["socket=/test/slurmrestd.socket"])
        self.assertIn(
            "WARNING:slurmweb.apps.agent:Using deprecated parameter "
            "[slurmrestd]>socket to define [slurmrest]>uri, update your site agent "
            "configuration file",
            cm.output,
        )
        self.assertEqual(
            self.app.settings.slurmrestd.uri.geturl(), "unix:/test/slurmrestd.socket"
        )
        self.assertEqual(self.app.settings.slurmrestd.uri.scheme, "unix")
        self.assertEqual(
            self.app.settings.slurmrestd.uri.path, "/test/slurmrestd.socket"
        )

    def test_app_slurmrestd_auth_local_deprecated(self):
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.setup_client(slurmrestd_parameters=["auth=local"])
        self.assertIn(
            "WARNING:slurmweb.apps.agent:Using deprecated slurmrestd local "
            "authentication method, it is recommended to migrate to jwt authentication",
            cm.output,
        )
        self.assertEqual(self.app.settings.slurmrestd.auth, "local")

    @mock.patch("slurmweb.apps.agent.SlurmrestdFilteredCached")
    def test_app_slurmrestd_conf_error(self, mock_slurmrestd):
        mock_slurmrestd.side_effect = SlurmwebConfigurationError("fail")
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.setup_client()
        self.assertEqual(
            cm.output, ["CRITICAL:slurmweb.apps.agent:Configuration error: fail"]
        )
