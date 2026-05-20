# Copyright (c) 2026 Rackslab
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


class SlurmwebExecGenSessionKey(SlurmwebExecBase):
    """CLI entrypoint for the Flask session key generation utility."""

    @staticmethod
    def register_subcommand(
        subparsers: argparse._SubParsersAction,
    ) -> argparse.ArgumentParser:
        """Declare gen-session-key subcommand arguments on the provided subparsers."""
        parser = subparsers.add_parser(
            "gen-session-key",
            help="Generate secret Flask session key for Slurm-web gateway",
            description="slurm-web gen-session-key",
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
            default=SlurmwebAppDefaults.GATEWAY.settings_definition,
            type=Path,
        )
        parser.add_argument(
            "--conf",
            help="Path to configuration file (default: %(default)s)",
            default=SlurmwebAppDefaults.GATEWAY.site_configuration,
            type=Path,
        )

        parser.set_defaults(app=SlurmwebExecGenSessionKey.app)
        return parser

    @staticmethod
    def app(seed: SlurmwebAppSeed):
        from ..apps.gensession import SlurmwebAppGenSessionKey

        return SlurmwebAppGenSessionKey(seed)
