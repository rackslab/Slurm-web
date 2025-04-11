# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import tempfile
from pathlib import Path

from rfl.authentication.jwt import JWTBaseManager, JWTPrivateKeyFileLoader, jwt_gen_key

from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier
from slurmweb.errors import SlurmwebConfigurationError


class TestSlurmrestdAuthentifier(unittest.TestCase):
    def test_local(self):
        authentifier = SlurmrestdAuthentifier(
            "local",
            "auto",
            "slurm",
            Path("/var/lib/slurm-web/slurmrestd.key"),
            3600,
            None,
        )
        self.assertEqual(authentifier.headers(), {})

    def test_static(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)
            manager = JWTBaseManager("HS256", JWTPrivateKeyFileLoader(key_path))
            key = manager.generate(duration=1, claimset={"sun": "slurm"})

        authentifier = SlurmrestdAuthentifier(
            "jwt",
            "static",
            "slurm",
            Path("/var/lib/slurm-web/slurmrestd.key"),
            3600,
            key,
        )
        self.assertEqual(
            authentifier.headers(),
            {"X-SLURM-USER-NAME": "slurm", "X-SLURM-USER-TOKEN": key},
        )

    def test_static_token_missing(self):
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            "^Missing token in configuration for slurmrestd jwt authentication in "
            "static mode$",
        ):
            SlurmrestdAuthentifier(
                "jwt",
                "static",
                "slurm",
                Path("/var/lib/slurm-web/slurmrestd.key"),
                3600,
                None,
            )

    def test_static_token_invalid(self):
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            "^Invalid slurmrestd JWT: Unable to decode token: Not enough segments$",
        ):
            SlurmrestdAuthentifier(
                "jwt",
                "static",
                "slurm",
                Path("/var/lib/slurm-web/slurmrestd.key"),
                3600,
                "fail",
            )

    def test_static_token_expired(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)
            manager = JWTBaseManager("HS256", JWTPrivateKeyFileLoader(key_path))
            key = manager.generate(duration=-1, claimset={"sun": "slurm"})

        with self.assertRaisesRegex(
            SlurmwebConfigurationError, "^Invalid slurmrestd JWT: Token is expired$"
        ):
            SlurmrestdAuthentifier(
                "jwt",
                "static",
                "slurm",
                Path("/var/lib/slurm-web/slurmrestd.key"),
                3600,
                key,
            )

    def test_static_headers_expiration_warning(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)
            manager = JWTBaseManager("HS256", JWTPrivateKeyFileLoader(key_path))
            key = manager.generate(duration=1 / 25, claimset={"sun": "slurm"})

        authentifier = SlurmrestdAuthentifier(
            "jwt",
            "static",
            "slurm",
            Path("/var/lib/slurm-web/slurmrestd.key"),
            3600,
            key,
        )
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            authentifier.headers()
        self.assertCountEqual(
            cm.output,
            [
                "WARNING:slurmweb.slurmrestd.auth:Static JWT for slurmrestd "
                "authentication will expire soon"
            ],
        )

    def test_static_headers_expiration_(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)
            manager = JWTBaseManager("HS256", JWTPrivateKeyFileLoader(key_path))
            key = manager.generate(duration=1 / 86400, claimset={"sun": "slurm"})

            authentifier = SlurmrestdAuthentifier(
                "jwt",
                "static",
                "slurm",
                Path("/var/lib/slurm-web/slurmrestd.key"),
                3600,
                key,
            )
            # Force expiration of token.
            authentifier.expiration = 0
        with self.assertLogs("slurmweb", level="WARNING") as cm:
            authentifier.headers()
        self.assertCountEqual(
            cm.output,
            [
                "ERROR:slurmweb.slurmrestd.auth:Static JWT for slurmrestd "
                "authentication is expired"
            ],
        )

    def test_auto(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)

            SlurmrestdAuthentifier(
                "jwt",
                "auto",
                "slurm",
                key_path,
                3600,
                None,
            )

    def test_auto_key_missing(self):
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            "^Unable to load JWT key for slurmrestd authentication: Token private key "
            "file /dev/fail not found$",
        ):
            SlurmrestdAuthentifier(
                "jwt",
                "auto",
                "slurm",
                Path("/dev/fail"),
                3600,
                None,
            )

    def test_auto_token_generate(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)

            authentifier = SlurmrestdAuthentifier(
                "jwt",
                "auto",
                "slurm",
                key_path,
                3600,
                None,
            )

        with self.assertLogs("slurmweb", level="INFO") as cm:
            headers = authentifier.headers()
        self.assertCountEqual(
            headers.keys(), ["X-SLURM-USER-NAME", "X-SLURM-USER-TOKEN"]
        )
        self.assertEqual(headers["X-SLURM-USER-NAME"], "slurm")
        self.assertCountEqual(
            cm.output,
            [
                "INFO:slurmweb.slurmrestd.auth:Generating new JWT for authentication "
                "to slurmrestd"
            ],
        )

    def test_auto_token_renew(self):
        with tempfile.NamedTemporaryFile() as fh:
            key_path = Path(fh.name)
            jwt_gen_key(key_path)

            authentifier = SlurmrestdAuthentifier(
                "jwt",
                "auto",
                "slurm",
                key_path,
                3600,
                None,
            )

        authentifier.jwt_token = authentifier.jwt_manager.generate(
            duration=0, claimset={"sun": "slurm"}
        )
        authentifier.expiration = 0
        with self.assertLogs("slurmweb", level="INFO") as cm:
            headers = authentifier.headers()
        self.assertCountEqual(
            headers.keys(), ["X-SLURM-USER-NAME", "X-SLURM-USER-TOKEN"]
        )
        self.assertEqual(headers["X-SLURM-USER-NAME"], "slurm")
        self.assertCountEqual(
            cm.output,
            [
                "INFO:slurmweb.slurmrestd.auth:Renewing JWT for authentication to "
                "slurmrestd"
            ],
        )
