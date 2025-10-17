# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
import urllib
import tempfile
from pathlib import Path

from rfl.authentication.jwt import jwt_gen_key

from slurmweb.slurmrestd import Slurmrestd
from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier
from slurmweb.slurmrestd.unix import SlurmrestdUnixAdapter
from slurmweb.errors import SlurmwebConfigurationError


class TestSlurmrestdUri(unittest.TestCase):
    def test_unix(self):
        slurmrestd = Slurmrestd(
            urllib.parse.urlparse("unix:///dev/null"),
            SlurmrestdAuthentifier(
                "local",
                "auto",
                "slurm",
                Path("/var/lib/slurm-web/slurmrestd.key"),
                3600,
                None,
            ),
            "1.0.0",
        )
        self.assertEqual(slurmrestd.prefix, "http+unix://slurmrestd")
        self.assertIsInstance(
            slurmrestd.session.adapters[slurmrestd.prefix], SlurmrestdUnixAdapter
        )

    def test_http(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)
            slurmrestd = Slurmrestd(
                urllib.parse.urlparse("http://localhost:6820"),
                SlurmrestdAuthentifier(
                    "jwt",
                    "auto",
                    "slurm",
                    key_path,
                    3600,
                    None,
                ),
                "1.0.0",
            )
        self.assertEqual(slurmrestd.prefix, "http://localhost:6820")

    def test_http_local_auth_error(self):
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            "slurmrestd local authentication is only supported with unix socket URI",
        ):
            Slurmrestd(
                urllib.parse.urlparse("http://localhost:6820"),
                SlurmrestdAuthentifier(
                    "local",
                    "auto",
                    "slurm",
                    Path("/var/lib/slurm-web/slurmrestd.key"),
                    3600,
                    None,
                ),
                "1.0.0",
            )
