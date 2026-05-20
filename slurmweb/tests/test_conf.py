# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import os
import tempfile
import unittest
from pathlib import Path

from slurmweb.conf import load_secret_from_file
from slurmweb.errors import SlurmwebConfigurationError

PARAMETER_NAME = "test secret"


class TestLoadSecretFromFile(unittest.TestCase):
    def test_none(self):
        self.assertIsNone(load_secret_from_file(None, PARAMETER_NAME))

    def test_valid(self):
        secret_file = Path(tempfile.NamedTemporaryFile(delete=False).name)
        secret_file.write_text("password")
        try:
            self.assertEqual(
                load_secret_from_file(secret_file, PARAMETER_NAME), "password"
            )
        finally:
            secret_file.unlink()

    def test_nonexistent(self):
        secret_file = Path("/nonexistent/file/path")
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            f"{PARAMETER_NAME} file path {secret_file} is not a file",
        ):
            load_secret_from_file(secret_file, PARAMETER_NAME)

    def test_no_permission(self):
        if os.geteuid() == 0:
            self.skipTest("Cannot test permission error as root")

        secret_file = Path(tempfile.NamedTemporaryFile(delete=False).name)
        secret_file.touch()
        # This has to be done separately, since .touch(mode=0o000)
        # will create the file with mode 0o600
        secret_file.chmod(0o000)
        try:
            with self.assertRaisesRegex(
                SlurmwebConfigurationError,
                f"Permission error to access {PARAMETER_NAME} file",
            ):
                load_secret_from_file(secret_file, PARAMETER_NAME)
        finally:
            secret_file.unlink()

    def test_invalid_utf8(self):
        secret_file = Path(tempfile.NamedTemporaryFile(delete=False).name)
        secret_file.write_bytes(b"\xff")
        try:
            with self.assertRaisesRegex(
                SlurmwebConfigurationError,
                f"Unable to decode {PARAMETER_NAME} file",
            ):
                load_secret_from_file(secret_file, PARAMETER_NAME)
        finally:
            secret_file.unlink()

    def test_empty(self):
        secret_file = Path(tempfile.NamedTemporaryFile(delete=False).name)
        try:
            with self.assertRaisesRegex(
                SlurmwebConfigurationError,
                f"{PARAMETER_NAME} loaded from file {secret_file} is empty",
            ):
                load_secret_from_file(secret_file, PARAMETER_NAME)
        finally:
            secret_file.unlink()
