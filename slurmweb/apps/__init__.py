# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
from typing import List
from pathlib import Path
import logging

from flask import Flask, jsonify
from rfl.settings import RuntimeSettings
from rfl.settings.errors import SettingsDefinitionError, SettingsOverrideError

from rfl.log import setup_logger, enforce_debug

logger = logging.getLogger(__name__)


class SlurmwebConfSeed:
    def __init__(
        self,
        debug: bool,
        log_flags: List[str],
        debug_flags: List[str],
        conf_defs: Path,
        conf: Path,
    ):
        self.debug = debug
        self.log_flags = log_flags
        self.debug_flags = debug_flags
        self.conf_defs = conf_defs
        self.conf = conf

    @classmethod
    def from_args(cls, args):
        return cls(
            args.debug, args.log_flags, args.debug_flags, args.conf_defs, args.conf
        )


class SlurmwebGenericApp:
    NAME = None
    SITE_CONFIGURATION = None
    SETTINGS_DEFINITION = None

    def __init__(self, seed: SlurmwebConfSeed):
        # load configuration files
        setup_logger(
            debug=seed.debug,
            log_flags=seed.log_flags,
            debug_flags=seed.debug_flags,
        )
        try:
            self.settings = RuntimeSettings.yaml_definition(seed.conf_defs)
        except SettingsDefinitionError as err:
            logger.critical(err)
            sys.exit(1)
        try:
            self.settings.override_ini(seed.conf)
        except SettingsOverrideError as err:
            logger.critical(err)
            sys.exit(1)

        if self.settings.service.debug:
            enforce_debug(
                log_flags=list(
                    set(seed.log_flags) | set(self.settings.service.log_flags)
                ),
                debug_flags=list(
                    set(seed.debug_flags) | set(self.settings.service.debug_flags)
                ),
            )

    def run(self):
        raise NotImplementedError


class SlurmwebWebApp(SlurmwebGenericApp, Flask):

    VIEWS = set()

    def __init__(self, seed: SlurmwebConfSeed):
        SlurmwebGenericApp.__init__(self, seed)
        Flask.__init__(self, self.NAME)
        # set URL rules
        for route in self.VIEWS:
            kwargs = dict()
            if route.methods is not None:
                kwargs["methods"] = route.methods
            self.add_url_rule(route.endpoint, view_func=route.func, **kwargs)
        self.debug_flags = seed.debug_flags

        # register generic error handler
        for error in [401, 403, 404, 500]:
            self.register_error_handler(error, self._handle_bad_request)

    def _handle_bad_request(self, error):
        return (
            jsonify(code=error.code, name=error.name, description=error.description),
            error.code,
        )

    def run(self):
        logger.info("Running %s application", self.NAME)
        if self.settings.service.cors:
            logger.debug("CORS is enabled")
            try:
                from flask_cors import CORS

                CORS(self)
            except ImportError:
                logger.warning("Unable to load CORS module, CORS is disabled.")
        Flask.run(
            self,
            host=self.settings.service.interface,
            port=self.settings.service.port,
            debug="werkzeug" in self.debug_flags,
        )
