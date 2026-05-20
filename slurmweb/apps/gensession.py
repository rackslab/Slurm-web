# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging
import os
import pwd
import secrets
import shutil
import sys

from . import SlurmwebAppSeed, SlurmwebGenericApp

logger = logging.getLogger(__name__)


class SlurmwebAppGenSessionKey(SlurmwebGenericApp):
    NAME = "slurm-web gen-session-key"

    def __init__(self, seed: SlurmwebAppSeed):
        super().__init__(seed)

    def run(self):
        logger.info("Running %s", self.NAME)

        if os.geteuid():
            logger.critical("This script must run as root")
            sys.exit(1)

        session_key_path = self.settings.service.session_key
        if session_key_path.exists():
            logger.warning("Session key file %s already exists", session_key_path)
        else:
            session_key_path.parent.mkdir(parents=True, exist_ok=True)
            session_key_path.write_text(secrets.token_urlsafe(64), encoding="utf-8")
            session_key_path.chmod(0o600)
            logger.info("Generated session key file %s", session_key_path)

        self.set_user_permission("slurm-web")

    def set_user_permission(self, user):
        session_key_path = self.settings.service.session_key
        try:
            pwd.getpwnam(user)
        except KeyError:
            logger.warning(
                "User %s not found, unable to set permission on session key "
                "for this user",
                user,
            )
        else:
            logger.info("Setting ownership of session key for %s user", user)
            shutil.chown(session_key_path, user=user)
