# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import sys
import urllib
import logging

from . import SlurmwebGenericApp

from ..slurmrestd import Slurmrestd
from ..slurmrestd.auth import SlurmrestdAuthentifier
from ..slurmrestd.errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdAuthenticationError,
    SlurmrestdInternalError,
)
from ..errors import SlurmwebConfigurationError

logger = logging.getLogger(__name__)


def fail(msg):
    logger.error(msg)
    print("❌ connection failure")
    sys.exit(1)


class SlurmwebAppConnectCheck(SlurmwebGenericApp):
    NAME = "slurm-web connect-check"

    def __init__(self, seed):
        SlurmwebGenericApp.__init__(self, seed)

        if self.settings.slurmrestd.socket:
            logger.warning(
                "Using deprecated parameter [slurmrestd]>socket to define "
                "[slurmrest]>uri, update your site agent configuration file"
            )
            self.settings.slurmrestd.uri = urllib.parse.urlparse(
                f"unix://{self.settings.slurmrestd.socket}"
            )

        # Warn deprecated local authentication method to slurmrestd
        if self.settings.slurmrestd.auth == "local":
            logger.warning(
                "Using deprecated slurmrestd local authentication method, it is "
                "recommended to migrate to jwt authentication"
            )

        logger.info(
            "slurmrestd URI: %s, authentication: %s, JWT mode: %s",
            self.settings.slurmrestd.uri.geturl(),
            self.settings.slurmrestd.auth,
            self.settings.slurmrestd.jwt_mode
            if self.settings.slurmrestd.auth == "jwt"
            else "N/A",
        )
        try:
            self.slurmrestd = Slurmrestd(
                self.settings.slurmrestd.uri,
                SlurmrestdAuthentifier(
                    self.settings.slurmrestd.auth,
                    self.settings.slurmrestd.jwt_mode,
                    self.settings.slurmrestd.jwt_user,
                    self.settings.slurmrestd.jwt_key,
                    self.settings.slurmrestd.jwt_lifespan,
                    self.settings.slurmrestd.jwt_token,
                ),
                self.settings.slurmrestd.versions,
            )
        except SlurmwebConfigurationError as err:
            logger.critical("Configuration error: %s", err)
            sys.exit(1)

    def run(self):
        logger.info("Running %s", self.NAME)

        try:
            cluster_name, slurm_version, api_version = self.slurmrestd.discover()
            print(
                f"✅ connection successful! (cluster: {cluster_name}, "
                f"slurm: {slurm_version}, api: {api_version})"
            )
        except SlurmrestdNotFoundError as err:
            fail(f"URL not found on slurmrestd: {err}")
        except SlurmrestdInvalidResponseError as err:
            fail(f"Invalid response from slurmrestd: {err}")
        except SlurmrestConnectionError as err:
            fail(f"Unable to connect to slurmrestd: {err}")
        except SlurmrestdAuthenticationError as err:
            fail(f"Authentication error on slurmrestd: {err}")
        except SlurmrestdInternalError as err:
            msg = f"slurmrestd error: {err.description} ({err.source})"
            if err.error != -1:
                msg += f" [{err.message}/{err.error}]"
            fail(msg)
