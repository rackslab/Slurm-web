# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import logging

from rfl.authentication.ldap import LDAPAuthentifier
from rfl.authentication.errors import LDAPAuthenticationError

from . import SlurmwebGenericApp

logger = logging.getLogger(__name__)


class SlurmwebAppLDAPCheck(SlurmwebGenericApp):
    NAME = "slurm-web-ldap-check"

    def run(self):
        logger.info("Running %s", self.NAME)
        self.authentifier = LDAPAuthentifier(
            uri=self.settings.ldap.uri,
            cacert=self.settings.ldap.cacert,
            user_base=self.settings.ldap.user_base,
            user_class=self.settings.ldap.user_class,
            group_base=self.settings.ldap.group_base,
            user_fullname_attribute=self.settings.ldap.user_fullname_attribute,
            group_name_attribute=self.settings.ldap.group_name_attribute,
            starttls=self.settings.ldap.starttls,
            bind_dn=self.settings.ldap.bind_dn,
            bind_password=self.settings.ldap.bind_password,
            restricted_groups=self.settings.ldap.restricted_groups,
        )
        try:
            users = self.authentifier.users(with_groups=True)
            if not len(users):
                print("No user found in LDAP directory.")
            else:
                print(f"Found {len(users)} user(s) in LDAP directory:")
            for user in users:
                print(f"- {str(user)}")
        except LDAPAuthenticationError as err:
            logger.error("LDAP error: %s", str(err))
