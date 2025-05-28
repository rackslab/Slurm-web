# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import tempfile
import os

import werkzeug
import jinja2

from rfl.authentication.user import AuthenticatedUser, AnonymousUser
from racksdb.version import get_version as racksdb_get_version
from slurmweb.version import get_version
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.gateway import SlurmwebAppGateway
from slurmweb.apps.gateway import SlurmwebAgent, SlurmwebAgentRacksDBSettings

from .utils import SlurmwebCustomTestResponse

CONF_TPL = """
[agents]
url=http://localhost

[jwt]
key={{ key }}

{% if ldap %}
[authentication]
enabled=yes

[ldap]
uri=ldap://localhost
{% endif %}
"""


def fake_slurmweb_agent(cluster: str):
    return SlurmwebAgent(
        get_version(),
        cluster,
        SlurmwebAgentRacksDBSettings(
            enabled=True, version=racksdb_get_version(), infrastructure=cluster
        ),
        metrics=True,
        url=f"http://{cluster}",
    )


class TestGatewayConfBase(unittest.TestCase):
    def setup_gateway_conf(self, ldap=False):
        # Generate JWT signing key
        self.key = tempfile.NamedTemporaryFile(mode="w+")
        self.key.write("hey")
        self.key.seek(0)

        self.vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "conf", "vendor"
        )

        # Generate configuration file
        self.conf = tempfile.NamedTemporaryFile(mode="w+")
        conf_template = jinja2.Template(CONF_TPL)
        self.conf.write(conf_template.render(key=self.key.name, ldap=ldap))
        self.conf.seek(0)

        # Configuration definition path
        self.conf_defs = os.path.join(self.vendor_path, "gateway.yml")


class TestGatewayBase(TestGatewayConfBase):
    def setup_app(self, anonymous_user=False, use_token=True):
        self.setup_gateway_conf()

        self.app = SlurmwebAppGateway(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
            )
        )

        # Close conf and key file handlers to remove temporary files
        self.conf.close()
        self.key.close()
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
