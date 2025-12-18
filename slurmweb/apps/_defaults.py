# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT


class SlurmwebAppDefaultsSettings:
    def __init__(self, site_configuration: str, settings_definition: str):
        self.site_configuration = site_configuration
        self.settings_definition = settings_definition


class SlurmwebAppDefaults:
    GATEWAY = SlurmwebAppDefaultsSettings(
        site_configuration="/etc/slurm-web/gateway.ini",
        settings_definition="/usr/share/slurm-web/conf/gateway.yml",
    )
    AGENT = SlurmwebAppDefaultsSettings(
        site_configuration="/etc/slurm-web/agent.ini",
        settings_definition="/usr/share/slurm-web/conf/agent.yml",
    )
