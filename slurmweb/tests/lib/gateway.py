# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import tempfile
import os

import werkzeug

from rfl.authentication.user import AuthenticatedUser, AnonymousUser
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.gateway import SlurmwebAppGateway

from .utils import SlurmwebCustomTestResponse

CONF = """
[agents]
url=http://localhost

[jwt]
key={key}
"""


class TestGatewayBase(unittest.TestCase):
    def setup_app(self, anonymous_user=False, use_token=True):
        # Generate JWT signing key
        key = tempfile.NamedTemporaryFile(mode="w+")
        key.write("hey")
        key.seek(0)

        self.vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "conf", "vendor"
        )

        # Generate configuration file
        conf = tempfile.NamedTemporaryFile(mode="w+")
        conf.write(CONF.format(key=key.name))
        conf.seek(0)

        # Configuration definition path
        conf_defs = os.path.join(self.vendor_path, "gateway.yml")

        self.app = SlurmwebAppGateway(
            SlurmwebConfSeed(
                debug=False,
                log_flags=["ALL"],
                debug_flags=[],
                conf_defs=conf_defs,
                conf=conf.name,
            )
        )
        conf.close()
        key.close()
        self.app.config.update(
            {
                "TESTING": True,
            }
        )

        # Get token valid to get user role with all permissions as defined in
        # default policy.
        if anonymous_user:
            self.user = AnonymousUser()
        else:
            self.user = AuthenticatedUser(
                login="test", fullname="Testing User", groups=["group"]
            )

        # werkzeug.test.TestResponse class does not have text and json
        # properties in werkzeug <= 0.15. When such version is installed, use
        # custom test response class to backport these text and json properties.
        try:
            getattr(werkzeug.test.TestResponse, "text")
            getattr(werkzeug.test.TestResponse, "json")
        except AttributeError:
            self.app.response_class = SlurmwebCustomTestResponse

        self.client = self.app.test_client()
        if use_token:
            token = self.app.jwt.generate(
                user=self.user,
                duration=3600,
            )
            self.client.environ_base["HTTP_AUTHORIZATION"] = "Bearer " + token
