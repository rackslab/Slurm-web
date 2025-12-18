#!/usr/bin/python3
#
# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.gateway import SlurmwebAppGateway
from slurmweb.apps._defaults import SlurmwebAppDefaults

application = SlurmwebAppGateway(
    SlurmwebAppSeed.with_parameters(
        debug=False,
        log_flags=["ALL"],
        log_component=None,
        debug_flags=[],
        conf_defs=SlurmwebAppDefaults.GATEWAY.settings_definition,
        conf=SlurmwebAppDefaults.GATEWAY.site_configuration,
    )
)
