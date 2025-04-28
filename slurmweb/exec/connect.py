# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import argparse
from pathlib import Path

from ..version import get_version
from . import SlurmwebAppArgs
from ..apps import SlurmwebConfSeed
from ..apps.connect import SlurmwebAppConnectCheck
from ..apps.agent import SlurmwebAppAgent


class SlurmwebExecConnectCheck:
    @staticmethod
    def run():
        parser = argparse.ArgumentParser(description=SlurmwebAppConnectCheck.NAME)
        parser.add_argument(
            "-v",
            "--version",
            dest="version",
            action="version",
            version="%(prog)s " + get_version(),
        )
        parser.add_argument(
            "--debug",
            dest="debug",
            action="store_true",
            help="Enable debug mode",
        )
        parser.add_argument(
            "--log-flags",
            help="Log flags (default: %(default)s)",
            default="ALL",
            nargs="*",
            choices=["slurmweb", "rfl", "racksdb", "werkzeug", "urllib3", "ALL"],
        )
        parser.add_argument(
            "--log-component",
            help="Optional component name in logs prefix",
        )
        parser.add_argument(
            "--debug-flags",
            help="Debug flags (default: %(default)s)",
            default="slurmweb",
            nargs="*",
            choices=["slurmweb", "rfl", "racksdb", "werkzeug", "urllib3", "ALL"],
        )
        parser.add_argument(
            "--conf-defs",
            help=(
                "Path to configuration settings definition file (default: %(default)s)"
            ),
            default=SlurmwebAppAgent.SETTINGS_DEFINITION,
            type=Path,
        )
        parser.add_argument(
            "--conf",
            help="Path to configuration file (default: %(default)s)",
            default=SlurmwebAppAgent.SITE_CONFIGURATION,
            type=Path,
        )

        application = SlurmwebAppConnectCheck(
            SlurmwebConfSeed.from_args(parser.parse_args(namespace=SlurmwebAppArgs))
        )
        application.run()
