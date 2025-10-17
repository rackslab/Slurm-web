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
from ..apps.showconf import SlurmwebAppShowConf
from ..apps.gateway import SlurmwebAppGateway
from ..apps.agent import SlurmwebAppAgent


class SlurmwebExecShowConf(SlurmwebExecBase):
    @staticmethod
    def seed(args=None):
        parser = argparse.ArgumentParser(description=SlurmwebAppShowConf.NAME)
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
            help="Path to configuration file",
            choices=["gateway", "agent"],
        )

        args = parser.parse_args(args=args, namespace=SlurmwebAppSeed())

        if args.component == "gateway":
            if args.conf is None:
                args.conf = Path(SlurmwebAppGateway.SITE_CONFIGURATION)
            if args.conf_defs is None:
                args.conf_defs = Path(SlurmwebAppGateway.SETTINGS_DEFINITION)
        else:
            if args.conf is None:
                args.conf = Path(SlurmwebAppAgent.SITE_CONFIGURATION)
            if args.conf_defs is None:
                args.conf_defs = Path(SlurmwebAppAgent.SETTINGS_DEFINITION)

        return args

    @staticmethod
    def app(args=None):
        return SlurmwebAppShowConf(SlurmwebExecShowConf.seed(args=args))
