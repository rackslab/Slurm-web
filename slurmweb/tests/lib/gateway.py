# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import unittest
import tempfile
import os
import time

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
{% if agents_extra %}
{% for key, value in agents_extra.items() %}
{{ key }}={{ value }}
{% endfor %}
{% endif %}

[jwt]
key={{ key }}

[ui]
{% if ui_enabled is defined and ui_enabled %}
enabled=yes
{% if ui_host is defined %}host={{ ui_host }}{% endif %}
{% if ui_path is defined %}path={{ ui_path }}{% endif %}
{% else %}
enabled=no
{% endif %}

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
        cache=True,
        url=f"http://{cluster}",
    )


class TestGatewayConfBase(unittest.TestCase):
    def setup_gateway_conf(self, **template_overrides):
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
        template_vars = {"key": self.key.name}
        template_vars.update(template_overrides)
        self.conf.write(conf_template.render(**template_vars))
        self.conf.seek(0)

        # Configuration definition path
        self.conf_defs = os.path.join(self.vendor_path, "gateway.yml")


class TestGatewayBase(TestGatewayConfBase):
    def setup_app(
        self,
        anonymous_user=False,
        use_token=True,
        conf_overrides=None,
    ):
        self.setup_gateway_conf(**(conf_overrides or {}))

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

    def app_set_agents(self, agents: t.Dict[str, SlurmwebAgent]):
        """Set gateway application _agents attribute with timeout in future to
        avoid application sending GET requests to retrieve /info."""
        self.app._agents = agents
        self.app._agents_timeout = int(time.time()) + 300
