# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import io
from pathlib import Path
import unittest
from unittest import mock

from slurmweb.version import get_version
from slurmweb.exec.main import SlurmwebExecMain
from slurmweb.exec.connect import SlurmwebExecConnectCheck
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps._defaults import SlurmwebAppDefaults


class TestConnectCheckExec(unittest.TestCase):
    def _parse(self, args):
        parser = SlurmwebExecMain.register_args()
        return parser.parse_args(["connect-check", *args], namespace=SlurmwebAppSeed())

    def test_seed_no_args(self):
        seed = self._parse([])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, False)
        self.assertEqual(seed.log_flags, "ALL")
        self.assertEqual(seed.log_component, None)
        self.assertEqual(seed.debug_flags, "slurmweb")
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(
            seed.conf_defs, Path(SlurmwebAppDefaults.AGENT.settings_definition)
        )
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path(SlurmwebAppDefaults.AGENT.site_configuration))

    def test_seed_version(self):
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            with self.assertRaisesRegex(SystemExit, "0"):
                self._parse(["--version"])
            self.assertIn(get_version(), stdout.getvalue())

    def test_seed_debug(self):
        seed = self._parse(["--debug", "--debug-flags", "slurmweb", "rfl"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, True)
        self.assertEqual(seed.debug_flags, ["slurmweb", "rfl"])

    def test_seed_conf(self):
        seed = self._parse(["--conf-defs", "/dev/null1", "--conf", "/dev/null2"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(seed.conf_defs, Path("/dev/null1"))
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path("/dev/null2"))

    def test_seed_wrong_args(self):
        with self.assertRaisesRegex(SystemExit, "2"):
            self._parse(["--fail"])

    @mock.patch("slurmweb.apps.connect.SlurmwebAppConnectCheck")
    def test_app(self, mock_slurmweb_app):
        seed = self._parse([])
        app = SlurmwebExecConnectCheck.app(seed)
        mock_slurmweb_app.assert_called_once_with(seed)
        self.assertEqual(app, mock_slurmweb_app.return_value)
