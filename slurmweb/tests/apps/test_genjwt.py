# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import os
from unittest import mock
from pathlib import Path

from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.genjwt import SlurmwebAppGenJWT

from ..lib.agent import TestAgentConfBase


class TestGenJwtApp(TestAgentConfBase):
    def setup(
        self,
    ):
        self.setup_agent_conf()
        self.app = SlurmwebAppGenJWT(
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
        self.slurmrestd_key.close()

    def test_setup(self):
        self.setup()

    def test_run_as_root(self):
        if os.geteuid() == 0:
            self.skipTest("Cannot test error message as root")
        self.setup()
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            ["CRITICAL:slurmweb.apps.genjwt:This script must run as root"],
        )

    @mock.patch("slurmweb.apps.genjwt.subprocess.run")
    @mock.patch("slurmweb.apps.genjwt.shutil.chown")
    @mock.patch("slurmweb.apps.genjwt.pwd.getpwnam")
    @mock.patch("slurmweb.apps.genjwt.os.geteuid")
    def test_run(
        self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown, mock_subprocess_run
    ):
        self.setup()
        mock_os_geteuid.return_value = 0
        self.app.run()
        mock_shutil_chown.assert_called_once_with(
            Path(self.app.settings.jwt.key), user="slurm-web"
        )
        mock_subprocess_run.assert_not_called()

    @mock.patch("slurmweb.apps.genjwt.subprocess.run")
    @mock.patch("slurmweb.apps.genjwt.shutil.chown")
    @mock.patch("slurmweb.apps.genjwt.pwd.getpwnam")
    @mock.patch("slurmweb.apps.genjwt.os.geteuid")
    def test_run_with_slurm(
        self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown, mock_subprocess_run
    ):
        self.setup()
        self.app.with_slurm = True
        mock_os_geteuid.return_value = 0
        self.app.run()
        mock_shutil_chown.assert_called_once_with(
            Path(self.app.settings.jwt.key), user="slurm-web"
        )
        mock_subprocess_run.assert_called_once_with(
            ["setfacl", "-m", "u:slurm:r", Path(self.app.settings.jwt.key)]
        )

    @mock.patch("slurmweb.apps.genjwt.subprocess.run")
    @mock.patch("slurmweb.apps.genjwt.shutil.chown")
    @mock.patch("slurmweb.apps.genjwt.pwd.getpwnam")
    @mock.patch("slurmweb.apps.genjwt.os.geteuid")
    def test_run_slurmweb_user_not_found(
        self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown, mock_subprocess_run
    ):
        self.setup()
        mock_os_geteuid.return_value = 0
        mock_pwd_getpwnam.side_effect = KeyError
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.app.run()
        mock_shutil_chown.assert_not_called()
        mock_subprocess_run.assert_not_called()
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.apps.genjwt:User slurm-web not found, unable to set "
                "permission on JWT key for this user"
            ],
        )

    @mock.patch("slurmweb.apps.genjwt.subprocess.run")
    @mock.patch("slurmweb.apps.genjwt.shutil.chown")
    @mock.patch("slurmweb.apps.genjwt.pwd.getpwnam")
    @mock.patch("slurmweb.apps.genjwt.os.geteuid")
    def test_run_slurm_user_not_found(
        self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown, mock_subprocess_run
    ):
        self.setup()
        self.app.with_slurm = True
        mock_os_geteuid.return_value = 0
        mock_pwd_getpwnam.side_effect = [0, KeyError]
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.app.run()
        mock_shutil_chown.assert_called_once_with(
            Path(self.app.settings.jwt.key), user="slurm-web"
        )
        mock_subprocess_run.assert_not_called()
        self.assertEqual(
            cm.output,
            [
                "WARNING:slurmweb.apps.genjwt:User slurm not found, unable to set "
                "permission on JWT key for this user"
            ],
        )
