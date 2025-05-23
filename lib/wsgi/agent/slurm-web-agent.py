#!/usr/bin/python3
#
# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.agent import SlurmwebAppAgent

application = SlurmwebAppAgent(
    SlurmwebAppSeed.with_parameters(
        debug=False,
        log_flags=["ALL"],
        log_component=None,
        debug_flags=[],
        conf_defs=SlurmwebAppAgent.SETTINGS_DEFINITION,
        conf=SlurmwebAppAgent.SITE_CONFIGURATION,
    )
)
