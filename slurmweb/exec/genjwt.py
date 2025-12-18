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


class SlurmwebExecGenJWT(SlurmwebExecBase):
    """CLI entrypoint for the JWT key generation utility."""

    @staticmethod
    def register_subcommand(
        subparsers: argparse._SubParsersAction,
    ) -> argparse.ArgumentParser:
        """Declare the 'gen-jwt-key' subcommand arguments on the provided subparsers."""
        parser = subparsers.add_parser(
            "gen-jwt-key",
            help="Generate secret JWT signing key for Slurm-web",
            description="slurm-web gen-jwt-key",
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
        parser.add_argument(
            "--with-slurm",
            dest="with_slurm",
            action="store_true",
            help="Also give read permission on JWT key to slurm user",
        )

        parser.set_defaults(app=SlurmwebExecGenJWT.app)
        return parser

    @staticmethod
    def app(seed: SlurmwebAppSeed):
        from ..apps.genjwt import SlurmwebAppGenJWT

        return SlurmwebAppGenJWT(seed)
