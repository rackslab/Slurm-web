# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import argparse
from pathlib import Path

from ..version import get_version
from . import SlurmwebExecBase
from ..apps import SlurmwebAppSeed
from ..apps.genjwt import SlurmwebAppGenJWT
from ..apps.gateway import SlurmwebAppGateway


class SlurmwebExecGenJWT(SlurmwebExecBase):
    @staticmethod
    def seed(args=None):
        parser = argparse.ArgumentParser(description=SlurmwebAppGenJWT.NAME)
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
            default=SlurmwebAppGateway.SETTINGS_DEFINITION,
            type=Path,
        )
        parser.add_argument(
            "--conf",
            help="Path to configuration file (default: %(default)s)",
            default=SlurmwebAppGateway.SITE_CONFIGURATION,
            type=Path,
        )
        parser.add_argument(
            "--with-slurm",
            dest="with_slurm",
            action="store_true",
            help="Also give read permission on JWT key to slurm user",
        )

        return parser.parse_args(args=args, namespace=SlurmwebAppSeed())

    @staticmethod
    def app(args=None):
        return SlurmwebAppGenJWT(SlurmwebExecGenJWT.seed(args=args))
