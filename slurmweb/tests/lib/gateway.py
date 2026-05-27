# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import unittest
import tempfile
import os
import shutil
import time

import werkzeug
import jinja2

from rfl.authentication.user import AuthenticatedUser, AnonymousUser

from slurmweb.version import get_version
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.gateway import SlurmwebAppGateway
from slurmweb.apps.gateway import SlurmwebAgent, SlurmwebAgentRacksDBSettings
from slurmweb.views.agent import racksdb_get_version

from .utils import SlurmwebCustomTestResponse


CONF_TPL = """
[agents]
url=http://localhost
{% if agents_extra %}
{% for key, value in agents_extra.items() %}
{{ key }}={{ value }}
{% endfor %}
{% endif %}

[service]
session_key={{ session_key }}

[jwt]
key={{ key }}

[ui]
{% if ui_enabled is defined and ui_enabled %}
enabled=yes
{% if ui_host is defined %}host={{ ui_host }}{% endif %}
{% if ui_path is defined %}path={{ ui_path }}{% endif %}
{% if ui_color_main is defined %}color_main={{ ui_color_main }}{% endif %}
{% if ui_logo_login is defined %}logo_login={{ ui_logo_login }}{% endif %}
{% if ui_logo_alt is defined %}logo_alt={{ ui_logo_alt }}{% endif %}
{% else %}
enabled=no
{% endif %}

{% if ldap %}
[authentication]
enabled=yes
method=ldap

[ldap]
uri=ldap://localhost
{% elif oidc %}
[authentication]
enabled=yes
method=oidc

[oidc]
issuer={{ oidc_issuer }}
client_id={{ oidc_client_id }}
{% if oidc_client_secret is defined and oidc_client_secret %}
client_secret={{ oidc_client_secret }}
{% endif %}
{% if oidc_redirect_uri is defined %}
redirect_uri={{ oidc_redirect_uri }}
{% endif %}
{% if pkce is defined and pkce %}
pkce={{ pkce }}
{% endif %}
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

        self.session_key = tempfile.NamedTemporaryFile(mode="w+")
        self.session_key.write("gateway-session-key")
        self.session_key.seek(0)

        self.vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "conf", "vendor"
        )

        if template_overrides.get("ui_enabled") and "ui_path" not in template_overrides:
            ui_dir = tempfile.mkdtemp()
            self.addCleanup(lambda: shutil.rmtree(ui_dir, ignore_errors=True))
            template_overrides = {**template_overrides, "ui_path": ui_dir}

        # Generate configuration file
        self.conf = tempfile.NamedTemporaryFile(mode="w+")
        template_vars = {
            "key": self.key.name,
            "session_key": self.session_key.name,
            "oidc_issuer": "https://idp.example.com",
            "oidc_client_id": "client-id",
        }
        template_vars.update(template_overrides)
        conf_template = jinja2.Template(CONF_TPL)
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
        self.session_key.close()
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

    def setup_app_with_ui(self, ui_enabled=True, host=None, **extra_conf):
        """Set up gateway app with UI enabled or disabled."""
        conf_overrides = {"ui_enabled": ui_enabled, **extra_conf}
        if ui_enabled:
            conf_overrides["ui_host"] = host or "http://localhost:5011/"
        self.setup_app(conf_overrides=conf_overrides)

    def setup_app_with_oidc(
        self, ui_host="http://localhost/", ui_enabled=False, **oidc_overrides
    ):
        conf_overrides = {
            "oidc": True,
            "ui_host": ui_host,
            "ui_enabled": ui_enabled,
            "oidc_redirect_uri": "http://localhost/api/oidc/callback",
        }
        if "oidc_client_secret" not in oidc_overrides:
            conf_overrides["oidc_client_secret"] = "client-secret"
        conf_overrides.update(oidc_overrides)
        self.setup_app(use_token=False, conf_overrides=conf_overrides)

    def setup_app_with_ldap(self, ui_host="http://localhost:5011/", ui_enabled=False):
        conf_overrides = {"ldap": True}
        if ui_enabled:
            conf_overrides["ui_enabled"] = True
            conf_overrides["ui_host"] = ui_host
        self.setup_app(use_token=False, conf_overrides=conf_overrides)

    def setup_app_with_anonymous(self, *, ldap=False):
        """Gateway with authentication disabled (default) or LDAP enabled."""
        self.setup_app(use_token=False, conf_overrides={"ldap": ldap})

    def app_set_agents(self, agents: t.Dict[str, SlurmwebAgent]):
        """Set gateway application _agents attribute with timeout in future to
        avoid application sending GET requests to retrieve /info."""
        self.app._agents = agents
        self.app._agents_timeout = int(time.time()) + 300
