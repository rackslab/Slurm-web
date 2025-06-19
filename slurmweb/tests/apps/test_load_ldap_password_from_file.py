import os
import tempfile
import unittest
from pathlib import Path

from slurmweb.apps import SlurmwebConfigurationError, load_ldap_password_from_file


class TestLoadLdapPasswordFromFile(unittest.TestCase):
    def test_none(self):
        self.assertIsNone(load_ldap_password_from_file(None))

    def test_valid(self):
        passfile = Path(tempfile.NamedTemporaryFile(delete=False).name)
        passfile.write_text("password")
        try:
            self.assertEqual(load_ldap_password_from_file(passfile), "password")
        finally:
            passfile.unlink()

    def test_nonexistent(self):
        passfile = Path("/nonexistent/file/path")
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            f"LDAP bind password file path {passfile} is not a file",
        ):
            load_ldap_password_from_file(passfile)

    def test_no_permission(self):
        if os.geteuid() == 0:
            self.skipTest("Cannot test permission error as root")

        passfile = Path(tempfile.NamedTemporaryFile(delete=False).name)
        passfile.touch()
        # This has to be done separately, since .touch(mode=0o000)
        # will create the file with mode 0o600
        passfile.chmod(0o000)
        try:
            with self.assertRaisesRegex(
                SlurmwebConfigurationError,
                "Permission error to access bind password file",
            ):
                load_ldap_password_from_file(passfile)
        finally:
            passfile.unlink()

    def test_invalid_utf8(self):
        passfile = Path(tempfile.NamedTemporaryFile(delete=False).name)
        passfile.write_bytes(b"\xff")
        try:
            with self.assertRaisesRegex(
                SlurmwebConfigurationError,
                "Unable to decode bind password file",
            ):
                load_ldap_password_from_file(passfile)
        finally:
            passfile.unlink()

    def test_empty(self):
        passfile = Path(tempfile.NamedTemporaryFile(delete=False).name)
        try:
            with self.assertRaisesRegex(
                SlurmwebConfigurationError,
                f"Bind Password loaded from file {passfile} is empty",
            ):
                load_ldap_password_from_file(passfile)
        finally:
            passfile.unlink()
