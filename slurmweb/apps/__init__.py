# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
from pathlib import Path
import logging
from typing import Optional

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
import jinja2
from rfl.settings import RuntimeSettings
from rfl.settings.errors import (
    SettingsDefinitionError,
    SettingsOverrideError,
    SettingsSiteLoaderError,
)

from rfl.log import setup_logger, enforce_debug

from ..errors import SlurmwebConfigurationError

logger = logging.getLogger(__name__)


def load_ldap_password_from_file(bind_password_file: Optional[Path]) -> Optional[str]:
    if bind_password_file is None:
        return None

    logger.debug("Loading LDAP bind password from the specified file")

    if not bind_password_file.is_file():
        raise SlurmwebConfigurationError(
            f"LDAP bind password file path {bind_password_file} is not a file"
        )
    try:
        bind_password = bind_password_file.read_text()
    except PermissionError as err:
        raise SlurmwebConfigurationError(
            f"Permission error to access bind password file {bind_password_file}"
        ) from err
    except UnicodeDecodeError as err:
        raise SlurmwebConfigurationError(
            f"Unable to decode bind password file {bind_password_file}: {err}"
        ) from err
    if not len(bind_password):
        raise SlurmwebConfigurationError(
            f"Bind Password loaded from file {bind_password_file} is empty"
        )

    return bind_password


class SlurmwebAppSeed:
    @classmethod
    def with_parameters(cls, **kwargs):
        seed = cls()
        for key, value in kwargs.items():
            setattr(seed, key, value)
        return seed


class SlurmwebGenericApp:
    NAME = None
    SITE_CONFIGURATION = None
    SETTINGS_DEFINITION = None

    def __init__(self, seed: SlurmwebAppSeed):
        # load configuration files
        setup_logger(
            debug=seed.debug,
            log_flags=seed.log_flags,
            debug_flags=seed.debug_flags,
            component=seed.log_component,
        )
        try:
            self.settings = RuntimeSettings.yaml_definition(seed.conf_defs)
        except SettingsDefinitionError as err:
            logger.critical(err)
            sys.exit(1)
        try:
            self.settings.override_ini(seed.conf)
        except (SettingsSiteLoaderError, SettingsOverrideError) as err:
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

    def __init__(self, seed: SlurmwebAppSeed):
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
        for error in [401, 403, 404, 500, 501]:
            self.register_error_handler(error, self._handle_bad_request)

    def _handle_bad_request(self, error):
        # In Flask < 1.1.0, this handler can receive any kind of exception
        # captured by Flask. Check error is a werkzeug HTTP exception. If not,
        # return HTTP/500 with description of the exception.
        if not isinstance(error, HTTPException):
            return (
                jsonify(code=500, name=type(error).__name__, description=str(error)),
                500,
            )
        return (
            jsonify(code=error.code, name=error.name, description=error.description),
            error.code,
        )

    def set_templates_folder(self, path: Path):
        """Change application jinja templates folder to look in the given path."""
        self.jinja_loader = jinja2.FileSystemLoader([path])

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
