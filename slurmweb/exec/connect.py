# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import argparse
from pathlib import Path

from ..version import get_version
from . import SlurmwebExecBase
from ..apps import SlurmwebAppSeed
from ..apps.connect import SlurmwebAppConnectCheck
from ..apps.agent import SlurmwebAppAgent


class SlurmwebExecConnectCheck(SlurmwebExecBase):
    """CLI entrypoint for the slurmrestd connection check utility."""

    @staticmethod
    def register_subcommand(
        subparsers: argparse._SubParsersAction,
    ) -> argparse.ArgumentParser:
        """
        Declare the 'connect-check' subcommand arguments on the provided subparsers.
        """
        parser = subparsers.add_parser(
            "connect-check",
            help="Check connection from Slurm-web agent to slurmrestd",
            description=SlurmwebAppConnectCheck.NAME,
        )
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

        parser.set_defaults(app=SlurmwebExecConnectCheck.app)
        return parser

    @staticmethod
    def app(seed: SlurmwebAppSeed):
        return SlurmwebAppConnectCheck(seed)
