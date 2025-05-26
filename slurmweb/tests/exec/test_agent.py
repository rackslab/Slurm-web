# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
import io
from pathlib import Path

from slurmweb.version import get_version
from slurmweb.exec.agent import SlurmwebExecAgent
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.agent import SlurmwebAppAgent


class TestAgentExec(unittest.TestCase):
    def test_seed_no_args(self):
        seed = SlurmwebExecAgent.seed([])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, False)
        self.assertEqual(seed.log_flags, "ALL")
        self.assertEqual(seed.log_component, None)
        self.assertEqual(seed.debug_flags, "slurmweb")
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(seed.conf_defs, Path(SlurmwebAppAgent.SETTINGS_DEFINITION))
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path(SlurmwebAppAgent.SITE_CONFIGURATION))

    def test_seed_version(self):
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            with self.assertRaisesRegex(SystemExit, "0"):
                SlurmwebExecAgent.seed(["--version"])
            self.assertIn(get_version(), stdout.getvalue())

    def test_seed_debug(self):
        seed = SlurmwebExecAgent.seed(["--debug", "--debug-flags", "slurmweb", "rfl"])
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertEqual(seed.debug, True)
        self.assertEqual(seed.debug_flags, ["slurmweb", "rfl"])

    def test_seed_conf(self):
        seed = SlurmwebExecAgent.seed(
            ["--conf-defs", "/dev/null1", "--conf", "/dev/null2"]
        )
        self.assertIsInstance(seed, SlurmwebAppSeed)
        self.assertIsInstance(seed.conf_defs, Path)
        self.assertEqual(seed.conf_defs, Path("/dev/null1"))
        self.assertIsInstance(seed.conf, Path)
        self.assertEqual(seed.conf, Path("/dev/null2"))

    def test_seed_wrong_args(self):
        with self.assertRaisesRegex(SystemExit, "2"):
            SlurmwebExecAgent.seed(["--fail"])

    @mock.patch("slurmweb.exec.agent.SlurmwebAppAgent")
    def test_app(self, mock_slurmweb_app):
        app = SlurmwebExecAgent.app([])
        mock_slurmweb_app.assert_called_once()
        self.assertEqual(app, mock_slurmweb_app.return_value)
