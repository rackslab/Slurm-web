# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import logging
import sys
from rfl.log import setup_logger

from . import SlurmwebConfSeed
from rfl.settings import RuntimeSettings
from rfl.settings.errors import (
    SettingsDefinitionError,
    SettingsOverrideError,
    SettingsSiteLoaderError,
)

logger = logging.getLogger(__name__)


class SlurmwebAppShowConf:
    NAME = "slurm-web-show-conf"

    def __init__(self, seed: SlurmwebConfSeed):
        # load configuration files
        setup_logger(
            debug=seed.debug,
            log_flags=seed.log_flags,
            debug_flags=seed.debug_flags,
        )
        self.conf_defs = seed.conf_defs
        self.conf = seed.conf
        self.component = seed.component

    def run(self):
        logger.info("Dumping configuration of Slurm-web %s", self.component)
        logger.info("Loading configuration definition: %s", self.conf_defs)
        try:
            self.settings = RuntimeSettings.yaml_definition(self.conf_defs)
        except SettingsDefinitionError as err:
            logger.critical(err)
            sys.exit(1)
        logger.info("Loading site configuration file: %s", self.conf)
        try:
            self.settings.override_ini(self.conf)
        except (SettingsSiteLoaderError, SettingsOverrideError) as err:
            logger.critical(err)
            sys.exit(1)

        self.settings.dump()
