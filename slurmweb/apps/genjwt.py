# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import os
import shutil
import sys
import pwd
import subprocess
import logging

from . import SlurmwebAppSeed, SlurmwebGenericApp

from rfl.core.utils import shlex_join
from rfl.authentication.jwt import jwt_gen_key
from rfl.authentication.errors import JWTPrivateKeyGeneratorError

logger = logging.getLogger(__name__)


class SlurmwebAppGenJWT(SlurmwebGenericApp):
    NAME = "slurm-web gen-jwt-key"

    def __init__(self, seed: SlurmwebAppSeed):
        super().__init__(seed)
        self.with_slurm = seed.with_slurm
        self.set_ownership = seed.set_ownership

    def run(self):
        """Generate the JWT signing key file.

        When run as root, the key file is created if missing and ownership is
        assigned to the slurm-web system user. With --with-slurm, a read ACL is
        also added for the slurm system user. When run as a non-root user, the
        key file is created with the caller's ownership and no chown or ACL
        changes are performed. With --set-ownership or --with-slurm, root is
        required and the command exits with an error otherwise.

        The parent directory of jwt.key must already exist; it is not created
        by this command. If the key file already exists, it is left unchanged.
        """
        logger.info("Running %s", self.NAME)

        if os.geteuid() == 0:
            apply_ownership = True
        elif self.set_ownership or self.with_slurm:
            logger.critical("This command must run as root to set ownership or ACLs")
            sys.exit(1)
        else:
            apply_ownership = False
        if self.settings.jwt.key.exists():
            logger.warning("JWT key %s already exist", self.settings.jwt.key)
        else:
            try:
                jwt_gen_key(self.settings.jwt.key)
            except JWTPrivateKeyGeneratorError as err:
                logger.critical("Error while generating JWT key: %s", err)
                sys.exit(1)

        if apply_ownership:
            self.set_user_permission("slurm-web")
            if self.with_slurm:
                self.set_user_permission("slurm", acl=True)

    def set_user_permission(self, user, acl=False):
        try:
            pwd.getpwnam(user)
        except KeyError:
            logger.warning(
                "User %s not found, unable to set permission on JWT key for this user",
                user,
            )
        else:
            logger.info("Setting read permission on key for %s user", user)
            if acl:
                try:
                    cmd = ["setfacl", "-m", f"u:{user}:r", self.settings.jwt.key]
                    subprocess.run(cmd)
                except subprocess.CalledProcessError as err:
                    logger.error(
                        "Error while running command: %s: %s", shlex_join(cmd), err
                    )
            else:
                shutil.chown(self.settings.jwt.key, user=user)
