# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import io
from unittest import mock

from rfl.authentication.errors import LDAPAuthenticationError

from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.ldap import SlurmwebAppLDAPCheck

from ..lib.gateway import TestGatewayConfBase


class TestLDAPCheckApp(TestGatewayConfBase):
    def setup(self, ldap=False):
        self.setup_gateway_conf(ldap=ldap)
        self.app = SlurmwebAppLDAPCheck(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
                with_slurm=False,
            )
        )
        # Close conf and keys file handlers to remove temporary files
        self.conf.close()
        self.key.close()

    def test_setup(self):
        self.setup()

    def test_run_without_ldap(self):
        self.setup()
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            [
                "CRITICAL:slurmweb.apps.ldap:LDAP directory URI is not defined in "
                "configuration, exiting"
            ],
        )

    @mock.patch("slurmweb.apps.ldap.LDAPAuthentifier")
    def test_run_no_user(self, mock_ldap_authentifier):
        self.setup(ldap=True)
        mock_ldap_authentifier.return_value.users.return_value = []
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            self.app.run()
            self.assertEqual(stdout.getvalue(), "No user found in LDAP directory.\n")
        mock_ldap_authentifier.assert_called_once()
        mock_ldap_authentifier.return_value.users.assert_called_once_with(
            with_groups=True
        )

    @mock.patch("slurmweb.apps.ldap.LDAPAuthentifier")
    def test_run_print_users(self, mock_ldap_authentifier):
        self.setup(ldap=True)
        mock_ldap_authentifier.return_value.users.return_value = ["user1", "user2"]
        with mock.patch("sys.stdout", new=io.StringIO()) as stdout:
            self.app.run()
            self.assertEqual(
                stdout.getvalue(),
                "Found 2 user(s) in LDAP directory:\n- user1\n- user2\n",
            )
        mock_ldap_authentifier.assert_called_once()
        mock_ldap_authentifier.return_value.users.assert_called_once_with(
            with_groups=True
        )

    @mock.patch("slurmweb.apps.ldap.LDAPAuthentifier")
    def test_run_ldap_authentication_error(self, mock_ldap_authentifier):
        self.setup(ldap=True)
        mock_ldap_authentifier.return_value.users.side_effect = LDAPAuthenticationError(
            "fail"
        )
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="ERROR") as cm:
                self.app.run()
        mock_ldap_authentifier.assert_called_once()
        mock_ldap_authentifier.return_value.users.assert_called_once_with(
            with_groups=True
        )
        self.assertEqual(
            cm.output,
            ["ERROR:slurmweb.apps.ldap:LDAP error: fail"],
        )
