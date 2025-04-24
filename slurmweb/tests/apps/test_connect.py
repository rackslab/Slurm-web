# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from unittest import mock

from slurmweb.errors import SlurmwebConfigurationError
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdAuthenticationError,
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestdInternalError,
)
from ..lib.connect import TestConnectCheckAppBase
from ..lib.utils import all_slurm_versions, SlurmwebAssetUnavailable


class TestConnectCheckApp(TestConnectCheckAppBase):
    def test_app_loaded(self):
        self.setup()

    def test_app_socket_deprecated(self):
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.setup(additional_conf="[slurmrestd]\nsocket=/test/slurmrestd.socket")
        self.assertIn(
            "WARNING:slurmweb.apps.connect:Using deprecated parameter "
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

    @mock.patch("slurmweb.apps.connect.Slurmrestd")
    def test_app_slurmrestd_conf_error(self, mock_slurmrestd):
        mock_slurmrestd.side_effect = SlurmwebConfigurationError("fail")
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.setup()
        self.assertEqual(
            cm.output, ["CRITICAL:slurmweb.apps.connect:Configuration error: fail"]
        )

    @all_slurm_versions
    def test_app_run(self, slurm_version):
        self.setup()
        try:
            [node_asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-ping", "meta")]
            )
        except SlurmwebAssetUnavailable:
            return
        self.app.run()

    def test_app_slurmrestd_connection_error(self):
        self.setup()
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestConnectionError("fake connection error")
        )
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.connect:Unable to connect to slurmrestd: fake "
                "connection error"
            ],
        )

    def test_app_slurmrestd_authentication_error(self):
        self.setup()
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdAuthenticationError("fake authentication error")
        )
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.connect:Authentication error on slurmrestd: fake "
                "authentication error"
            ],
        )

    def test_app_slurmrestd_not_found_error(self):
        self.setup()
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdNotFoundError("fake not found error")
        )
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.connect:URL not found on slurmrestd: fake not "
                "found error"
            ],
        )

    def test_app_slurmrestd_invalid_response_error(self):
        self.setup()
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdInvalidResponseError("fake invalid response error")
        )
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.connect:Invalid response from slurmrestd: fake "
                "invalid response error"
            ],
        )

    def test_app_slurmrestd_internal_error(self):
        self.setup()
        self.app.slurmrestd._request = mock.Mock(
            side_effect=SlurmrestdInternalError(
                "slurmrestd fake error",
                -1,
                "fake error description",
                "fake error source",
            )
        )
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.connect:slurmrestd error: fake error description "
                "(fake error source)"
            ],
        )
