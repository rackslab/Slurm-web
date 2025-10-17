# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import io
from unittest import mock
from pathlib import Path


from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.showconf import SlurmwebAppShowConf

from ..lib.gateway import TestGatewayConfBase
from ..lib.agent import TestAgentConfBase


class TestShowConfApp(TestGatewayConfBase, TestAgentConfBase):
    def setup(self, component):
        if component == "agent":
            self.setup_agent_conf()
        else:
            self.setup_gateway_conf()

        self.app = SlurmwebAppShowConf(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
                component=component,
            )
        )
        # Close keys files handlers to remove temporary files. The file handler to
        # configuration file is closed later in tearDown() because self.app.run() needs
        # to read the file.
        self.key.close()
        try:
            self.slurmrestd_key.close()
        except AttributeError:
            # TestGatewayConfBase does not has slurmrestd_key attribute
            pass

    def tearDown(self):
        # Close conf file handler to remove temporary file
        self.conf.close()

    def test_setup_agent(self):
        self.setup(component="agent")

    def test_run_agent(self):
        self.setup(component="agent")
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            self.app.run()
            self.assertIn("[filters]\n", stdout.getvalue())

    def test_run_agent_missing_conf_defs(self):
        self.setup(component="agent")
        self.app.conf_defs = Path("/dev/fail")
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "CRITICAL:slurmweb.apps.showconf:Settings definition file /dev/fail "
                "not found"
            ],
        )

    def test_run_agent_missing_conf(self):
        self.setup(component="agent")
        self.conf.close()
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "CRITICAL:slurmweb.apps.showconf:Parameter [service]>cluster is "
                "missing but required in settings overrides"
            ],
        )

    def test_setup_gateway(self):
        self.setup(component="gateway")

    def test_run_gateway(self):
        self.setup(component="gateway")
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            self.app.run()
            self.assertIn("[agents]\n", stdout.getvalue())

    def test_run_gateway_missing_conf_defs(self):
        self.setup(component="gateway")
        self.app.conf_defs = Path("/dev/fail")
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "CRITICAL:slurmweb.apps.showconf:Settings definition file /dev/fail "
                "not found"
            ],
        )

    def test_run_gateway_missing_conf(self):
        self.setup(component="gateway")
        self.conf.close()
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "CRITICAL:slurmweb.apps.showconf:Parameter [agents]>url is missing "
                "but required in settings overrides"
            ],
        )
