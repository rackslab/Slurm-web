# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import argparse
from pathlib import Path

from ..version import get_version
from . import SlurmwebExecBase
from ..apps import SlurmwebAppSeed
from ..apps._defaults import SlurmwebAppDefaults


class SlurmwebExecAgent(SlurmwebExecBase):
    """CLI entrypoint for the Slurm-web agent component."""

    @staticmethod
    def register_subcommand(
        subparsers: argparse._SubParsersAction,
    ) -> argparse.ArgumentParser:
        """Declare the 'agent' subcommand arguments on the provided subparsers."""
        parser = subparsers.add_parser(
            "agent",
            help="Start Slurm-web agent component",
            description="slurm-web agent",
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
            default=SlurmwebAppDefaults.AGENT.settings_definition,
            type=Path,
        )
        parser.add_argument(
            "--conf",
            help="Path to configuration file (default: %(default)s)",
            default=SlurmwebAppDefaults.AGENT.site_configuration,
            type=Path,
        )
        parser.set_defaults(app=SlurmwebExecAgent.app)
        return parser

    @staticmethod
    def app(seed: SlurmwebAppSeed):
        from ..apps.agent import SlurmwebAppAgent

        return SlurmwebAppAgent(seed)
