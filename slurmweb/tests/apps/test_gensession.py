# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import os
import tempfile
from pathlib import Path
import unittest
from unittest import mock

import jinja2

from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.gensession import SlurmwebAppGenSessionKey


CONF_TPL = """
[agents]
url=http://localhost

[jwt]
key={{ key }}

[service]
session_key={{ session_key }}
"""


class TestGenSessionKeyApp(unittest.TestCase):
    def setup(self):
        self.key = tempfile.NamedTemporaryFile(mode="w+")
        self.key.write("hey")
        self.key.seek(0)

        # Reserve a unique session_key path. Closing removes the empty placeholder on
        # Linux (delete=True) so tests run with a configured path but no file yet.
        self.session_key = tempfile.NamedTemporaryFile()
        self.session_key.close()

        self.vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "conf", "vendor"
        )
        self.conf = tempfile.NamedTemporaryFile(mode="w+")
        conf_template = jinja2.Template(CONF_TPL)
        self.conf.write(
            conf_template.render(
                key=self.key.name,
                session_key=self.session_key.name,
            )
        )
        self.conf.seek(0)
        self.conf_defs = os.path.join(self.vendor_path, "gateway.yml")

        self.app = SlurmwebAppGenSessionKey(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
            )
        )
        self.conf.close()
        self.key.close()

    def tearDown(self):
        # setup() is called manually, not via setUp(), so tearDown still runs when a
        # test skips before setup() (eg. test_run_as_root as root). Remove the session
        # key file when setup() actually created it during the test.
        if hasattr(self, "session_key"):
            try:
                Path(self.session_key.name).unlink()
            except FileNotFoundError:
                pass

    def test_run_as_root(self):
        if os.geteuid() == 0:
            self.skipTest("Cannot test error message as root")
        self.setup()
        with self.assertRaisesRegex(SystemExit, "1"):
            with self.assertLogs("slurmweb", level="CRITICAL") as cm:
                self.app.run()
        self.assertEqual(
            cm.output,
            ["CRITICAL:slurmweb.apps.gensession:This script must run as root"],
        )

    @mock.patch("slurmweb.apps.gensession.shutil.chown")
    @mock.patch("slurmweb.apps.gensession.pwd.getpwnam")
    @mock.patch("slurmweb.apps.gensession.os.geteuid")
    def test_run(self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown):
        self.setup()
        mock_os_geteuid.return_value = 0
        self.app.run()
        session_key_path = Path(self.session_key.name)
        self.assertTrue(session_key_path.exists())
        self.assertNotEqual(session_key_path.read_text(encoding="utf-8"), "")
        self.assertEqual(oct(session_key_path.stat().st_mode)[-3:], "600")
        mock_shutil_chown.assert_called_once_with(session_key_path, user="slurm-web")

    @mock.patch("slurmweb.apps.gensession.shutil.chown")
    @mock.patch("slurmweb.apps.gensession.pwd.getpwnam")
    @mock.patch("slurmweb.apps.gensession.os.geteuid")
    def test_run_existing_file(
        self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown
    ):
        self.setup()
        session_key_path = Path(self.session_key.name)
        session_key_path.write_text("existing-secret", encoding="utf-8")
        mock_os_geteuid.return_value = 0
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.app.run()
        self.assertEqual(
            session_key_path.read_text(encoding="utf-8"),
            "existing-secret",
        )
        self.assertIn("already exists", cm.output[0])
        mock_shutil_chown.assert_called_once_with(session_key_path, user="slurm-web")

    @mock.patch("slurmweb.apps.gensession.shutil.chown")
    @mock.patch("slurmweb.apps.gensession.pwd.getpwnam")
    @mock.patch("slurmweb.apps.gensession.os.geteuid")
    def test_run_slurmweb_user_not_found(
        self, mock_os_geteuid, mock_pwd_getpwnam, mock_shutil_chown
    ):
        self.setup()
        mock_os_geteuid.return_value = 0
        mock_pwd_getpwnam.side_effect = KeyError
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            self.app.run()
        mock_shutil_chown.assert_not_called()
        self.assertIn(
            "WARNING:slurmweb.apps.gensession:User slurm-web not found",
            cm.output[0],
        )


if __name__ == "__main__":
    unittest.main()
