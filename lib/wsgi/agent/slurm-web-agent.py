#!/usr/bin/python3
#
# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.agent import SlurmwebAppAgent
from slurmweb.apps._defaults import SlurmwebAppDefaults

application = SlurmwebAppAgent(
    SlurmwebAppSeed.with_parameters(
        debug=False,
        log_flags=["ALL"],
        log_component=None,
        debug_flags=[],
        conf_defs=SlurmwebAppDefaults.AGENT.settings_definition,
        conf=SlurmwebAppDefaults.AGENT.site_configuration,
    )
)
