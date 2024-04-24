#!/usr/bin/python3
#
# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.agent import SlurmwebAppAgent

application = SlurmwebAppAgent(
    SlurmwebConfSeed(
        debug=False,
        log_flags=["ALL"],
        debug_flags=[],
        conf_defs=SlurmwebAppAgent.SETTINGS_DEFINITION,
        conf=SlurmwebAppAgent.SITE_CONFIGURATION,
    )
)
