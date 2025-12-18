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


class SlurmwebExecShowConf(SlurmwebExecBase):
    """CLI entrypoint for the configuration dump utility."""

    @staticmethod
    def register_subcommand(
        subparsers: argparse._SubParsersAction,
    ) -> argparse.ArgumentParser:
        """Declare the 'show-conf' subcommand arguments on the provided subparsers."""
        parser = subparsers.add_parser(
            "show-conf",
            help="Dump Slurm-web components configuration settings",
            description="slurm-web show-conf",
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
            help=("Path to component configuration settings definition file"),
            type=Path,
        )
        parser.add_argument(
            "--conf",
            help="Path to configuration file",
            type=Path,
        )
        parser.add_argument(
            "component",
            help="Component to inspect",
            choices=["gateway", "agent"],
        )

        parser.set_defaults(app=SlurmwebExecShowConf.app)
        return parser

    @staticmethod
    def app(seed: SlurmwebAppSeed):
        if seed.component == "gateway":
            if seed.conf is None:
                seed.conf = Path(SlurmwebAppDefaults.GATEWAY.site_configuration)
            if seed.conf_defs is None:
                seed.conf_defs = Path(SlurmwebAppDefaults.GATEWAY.settings_definition)
        else:
            if seed.conf is None:
                seed.conf = Path(SlurmwebAppDefaults.AGENT.site_configuration)
            if seed.conf_defs is None:
                seed.conf_defs = Path(SlurmwebAppDefaults.AGENT.settings_definition)

        from ..apps.showconf import SlurmwebAppShowConf

        return SlurmwebAppShowConf(seed)
