#!/usr/bin/python3
#
# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.gateway import SlurmwebAppGateway

application = SlurmwebAppGateway(
    SlurmwebConfSeed(
        debug=False,
        log_flags=["ALL"],
        debug_flags=[],
        conf_defs=SlurmwebAppGateway.SETTINGS_DEFINITION,
        conf=SlurmwebAppGateway.SITE_CONFIGURATION,
    )
)
