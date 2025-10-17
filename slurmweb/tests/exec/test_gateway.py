# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
from unittest import mock
import io
from pathlib import Path

from slurmweb.version import get_version
from slurmweb.exec.gateway import SlurmwebExecGateway
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.gateway import SlurmwebAppGateway


class TestGatewayExec(unittest.TestCase):
    def test_seed_no_args(self):
        seed = SlurmwebExecGateway.seed([])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, False)
        self.assertEqual(seed.log_flags, "ALL")
        self.assertEqual(seed.log_component, None)
        self.assertEqual(seed.debug_flags, "slurmweb")
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(seed.conf_defs, Path(SlurmwebAppGateway.SETTINGS_DEFINITION))
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path(SlurmwebAppGateway.SITE_CONFIGURATION))

    def test_seed_version(self):
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            with self.assertRaisesRegex(SystemExit, "0"):
                SlurmwebExecGateway.seed(["--version"])
            self.assertIn(get_version(), stdout.getvalue())

    def test_seed_debug(self):
        seed = SlurmwebExecGateway.seed(["--debug", "--debug-flags", "slurmweb", "rfl"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, True)
        self.assertEqual(seed.debug_flags, ["slurmweb", "rfl"])

    def test_seed_conf(self):
        seed = SlurmwebExecGateway.seed(
            ["--conf-defs", "/dev/null1", "--conf", "/dev/null2"]
        )
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(seed.conf_defs, Path("/dev/null1"))
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path("/dev/null2"))

    def test_seed_wrong_args(self):
        with self.assertRaisesRegex(SystemExit, "2"):
            SlurmwebExecGateway.seed(["--fail"])

    @mock.patch("slurmweb.exec.gateway.SlurmwebAppGateway")
    def test_app(self, mock_slurmweb_app):
        app = SlurmwebExecGateway.app([])
        mock_slurmweb_app.assert_called_once()
        self.assertEqual(app, mock_slurmweb_app.return_value)
