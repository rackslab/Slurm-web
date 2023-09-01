# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
import logging

from flask import Flask, jsonify
from rfl.settings import RuntimeSettings
from rfl.settings.errors import SettingsDefinitionError, SettingsOverrideError

from rfl.log import setup_logger, TTYFormatter

logger = logging.getLogger(__name__)


class SlurmwebAppArgs:
    """argparser Namespace for SlurmwebExec*"""

    pass


class SlurmwebGenericApp:
    NAME = None
    SITE_CONFIGURATION = None
    SETTINGS_DEFINITION = None

    def __init__(self, args: SlurmwebAppArgs):
        # load configuration files
        setup_logger(
            TTYFormatter,
            debug=args.debug,
            flags=args.debug_flags,
        )
        try:
            self.settings = RuntimeSettings.yaml_definition(args.conf_defs)
        except SettingsDefinitionError as err:
            logger.critical(err)
            sys.exit(1)
        try:
            self.settings.override_ini(args.conf)
        except SettingsOverrideError as err:
            logger.critical(err)
            sys.exit(1)

    def run(self):
        raise NotImplementedError


class SlurmwebWebApp(SlurmwebGenericApp, Flask):

    VIEWS = set()

    def __init__(self, args: SlurmwebAppArgs):
        SlurmwebGenericApp.__init__(self, args)
        Flask.__init__(self, self.NAME)
        # set URL rules
        for route in self.VIEWS:
            kwargs = dict()
            if route.methods is not None:
                kwargs["methods"] = route.methods
            self.add_url_rule(route.endpoint, view_func=route.func, **kwargs)
        self.debug_flags = args.debug_flags

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
            from flask_cors import CORS

            CORS(self)
        Flask.run(
            self,
            host=self.settings.service.interface,
            port=self.settings.service.port,
            debug="werkzeug" in self.debug_flags,
        )
