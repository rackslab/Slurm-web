#!/usr/bin/env python3
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import argparse
import sys

from ..version import get_version
from ..apps import SlurmwebAppSeed
from . import SlurmwebExecBase
from .agent import SlurmwebExecAgent
from .gateway import SlurmwebExecGateway
from .ldap import SlurmwebExecLDAPCheck
from .genjwt import SlurmwebExecGenJWT
from .showconf import SlurmwebExecShowConf
from .connect import SlurmwebExecConnectCheck


class SlurmwebExecMain(SlurmwebExecBase):
    """Unified entrypoint for all Slurm-web commands."""

    SUBCOMMANDS = {
        "agent": SlurmwebExecAgent,
        "gateway": SlurmwebExecGateway,
        "ldap-check": SlurmwebExecLDAPCheck,
        "gen-jwt-key": SlurmwebExecGenJWT,
        "show-conf": SlurmwebExecShowConf,
        "connect-check": SlurmwebExecConnectCheck,
    }

    @classmethod
    def register_args(cls) -> argparse.ArgumentParser:
        parser = argparse.ArgumentParser(
            prog="slurm-web",
            description="Slurm-web command line interface",
        )
        parser.add_argument(
            "-v",
            "--version",
            dest="version",
            action="version",
            version="%(prog)s " + get_version(),
        )

        subparsers = parser.add_subparsers(
            title="subcommands",
            dest="command",
            metavar="SUBCOMMAND",
            help="slurm-web subcommand to execute",
        )

        for name, cls in cls.SUBCOMMANDS.items():
            cls.register_subcommand(subparsers)

        return parser

    @classmethod
    def run(cls, argv=None) -> None:
        parser = cls.register_args()
        args = parser.parse_args(args=argv, namespace=SlurmwebAppSeed())

        if not args.command:
            parser.print_help()
            parser.exit(2)

        # Delegate execution to the selected subcommand implementation.
        try:
            args.app(args).run()
        except KeyboardInterrupt:
            # Provide a clean exit code on Ctrl-C.
            sys.exit(130)
