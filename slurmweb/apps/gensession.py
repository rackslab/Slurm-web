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
        self.set_ownership = seed.set_ownership

    def run(self):
        """Generate the gateway session secret key file.

        When run as root, the key file is created if missing and ownership is
        assigned to the slurm-web system user. When run as a non-root user, the
        key file is created with the caller's ownership and no chown is
        performed. With --set-ownership, root is required and the command exits
        with an error otherwise.

        The parent directory of service.session_key must already exist; it is
        not created by this command. If the key file already exists, it is left
        unchanged.
        """
        logger.info("Running %s", self.NAME)

        if os.geteuid() == 0:
            apply_ownership = True
        elif self.set_ownership:
            logger.critical("This command must run as root to set ownership")
            sys.exit(1)
        else:
            apply_ownership = False

        session_key_path = self.settings.service.session_key
        if session_key_path.exists():
            logger.warning("Session key file %s already exists", session_key_path)
        else:
            if not session_key_path.parent.is_dir():
                logger.critical(
                    "Session key parent directory %s not found",
                    session_key_path.parent,
                )
                sys.exit(1)
            session_key_path.write_text(secrets.token_urlsafe(64), encoding="utf-8")
            session_key_path.chmod(0o600)
            logger.info("Generated session key file %s", session_key_path)

        if apply_ownership:
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
