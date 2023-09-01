# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import argparse
from pathlib import Path

from ..version import get_version
from ..apps import SlurmwebAppArgs
from ..apps.ldap import SlurmwebAppLDAPCheck
from ..apps.gateway import SlurmwebAppGateway


class SlurmwebExecLDAPCheck:
    @staticmethod
    def run():
        parser = argparse.ArgumentParser(description=SlurmwebAppLDAPCheck.NAME)
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

        application = SlurmwebAppLDAPCheck(parser.parse_args(namespace=SlurmwebAppArgs))
        application.run()
