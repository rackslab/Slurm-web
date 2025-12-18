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
from slurmweb.exec.showconf import SlurmwebExecShowConf
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps._defaults import SlurmwebAppDefaults


class TestShowConfExec(unittest.TestCase):
    def _parse(self, args):
        parser = SlurmwebExecMain.register_args()
        return parser.parse_args(["show-conf", *args], namespace=SlurmwebAppSeed())

    def test_seed_gateway(self):
        seed = self._parse(["gateway"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, False)
        self.assertEqual(seed.log_flags, "ALL")
        self.assertEqual(seed.log_component, None)
        self.assertEqual(seed.debug_flags, "slurmweb")
        # Defaults for configuration paths are applied lazily in app(), not at parse
        # time.
        self.assertIsNone(seed.conf_defs)
        self.assertIsNone(seed.conf)

    def test_seed_agent(self):
        seed = self._parse(["agent"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        # Defaults for configuration paths are applied lazily in app(), not at parse
        # time.
        self.assertIsNone(seed.conf_defs)
        self.assertIsNone(seed.conf)

    def test_missing_component(self):
        with self.assertRaisesRegex(SystemExit, "2"):
            self._parse([])

    def test_seed_version(self):
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            with self.assertRaisesRegex(SystemExit, "0"):
                self._parse(["--version"])
            self.assertIn(get_version(), stdout.getvalue())

    def test_seed_debug(self):
        seed = self._parse(["--debug-flags", "slurmweb", "rfl", "--debug", "gateway"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, True)
        self.assertEqual(seed.debug_flags, ["slurmweb", "rfl"])

    def test_seed_conf(self):
        seed = self._parse(
            ["--conf-defs", "/dev/null1", "--conf", "/dev/null2", "gateway"]
        )
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(seed.conf_defs, Path("/dev/null1"))
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path("/dev/null2"))

    def test_seed_wrong_args(self):
        with self.assertRaisesRegex(SystemExit, "2"):
            self._parse(["--fail"])

    @mock.patch("slurmweb.apps.showconf.SlurmwebAppShowConf")
    def test_app(self, mock_slurmweb_app):
        seed = self._parse(["gateway"])
        app = SlurmwebExecShowConf.app(seed)
        mock_slurmweb_app.assert_called_once()
        # Retrieve the seed actually passed to SlurmwebAppShowConf
        called_seed = mock_slurmweb_app.call_args[0][0]
        self.assertIsInstance(called_seed, SlurmwebAppSeed)
        self.assertEqual(
            called_seed.conf_defs,
            Path(SlurmwebAppDefaults.GATEWAY.settings_definition),
        )
        self.assertEqual(
            called_seed.conf,
            Path(SlurmwebAppDefaults.GATEWAY.site_configuration),
        )
        self.assertEqual(app, mock_slurmweb_app.return_value)
