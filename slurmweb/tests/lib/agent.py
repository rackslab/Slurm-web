# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock
import tempfile
import os


import werkzeug
from flask import Blueprint, jsonify
import jinja2

from rfl.authentication.user import AuthenticatedUser, AnonymousUser
from rfl.permissions.rbac import ANONYMOUS_ROLE
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.apps.agent import SlurmwebAppAgent
from racksdb.errors import RacksDBFormatError, RacksDBSchemaError

from .utils import (
    mock_slurmrestd_responses,
    SlurmwebAssetUnavailable,
    SlurmwebCustomTestResponse,
)


CONF_TPL = """
[service]
cluster=test

[jwt]
key={{ key }}

[policy]
definition={{ policy_defs }}
vendor_roles={{ policy }}

{% if not racksdb %}
[racksdb]
enabled=no
{% endif %}

[slurmrestd]
jwt_key={{ slurmrestd_key }}
{% if slurmrestd_parameters %}
{% for slurmrestd_parameter in slurmrestd_parameters %}
{{ slurmrestd_parameter }}
{% endfor %}
{% endif %}

{% if metrics %}
[metrics]
enabled=yes
{% endif %}

{% if cache %}
[cache]
enabled=yes
{% endif %}
"""


class FakeRacksDBWebBlueprint(Blueprint):
    """Fake RacksDB web blueprint to avoid testing RacksDB in the scope of
    Slurm-web test cases."""

    def __init__(self, **kwargs):
        super().__init__("Fake RacksDB web blueprint", __name__)
        self.add_url_rule("/fake", view_func=self.basic)

    def basic(self):
        return jsonify({"test": "ok"})


class TestAgentConfBase(unittest.TestCase):
    def setup_agent_conf(
        self, slurmrestd_parameters=None, racksdb=True, metrics=False, cache=False
    ):
        # Generate JWT signing key
        self.key = tempfile.NamedTemporaryFile(mode="w+")
        self.key.write("hey")
        self.key.seek(0)

        # Generate slurmrestd_key
        self.slurmrestd_key = tempfile.NamedTemporaryFile(mode="w+")
        self.slurmrestd_key.write("hey")
        self.slurmrestd_key.seek(0)

        vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "conf", "vendor"
        )

        # Policy definition path
        policy_defs = os.path.join(vendor_path, "policy.yml")

        # Policy path
        policy = os.path.join(vendor_path, "policy.ini")

        # Generate configuration file
        self.conf = tempfile.NamedTemporaryFile(mode="w+")
        conf_template = jinja2.Template(CONF_TPL)
        self.conf.write(
            conf_template.render(
                key=self.key.name,
                policy_defs=policy_defs,
                policy=policy,
                slurmrestd_key=self.slurmrestd_key.name,
                slurmrestd_parameters=slurmrestd_parameters,
                racksdb=racksdb,
                metrics=metrics,
                cache=cache,
            )
        )
        self.conf.seek(0)

        self.conf_defs = os.path.join(vendor_path, "agent.yml")


class TestSlurmrestdClient(TestAgentConfBase):
    def mock_slurmrestd_responses(self, slurm_version, assets):
        try:
            return mock_slurmrestd_responses(self.app.slurmrestd, slurm_version, assets)
        except SlurmwebAssetUnavailable as err:
            self.skipTest(str(err))


class TestAgentBase(TestSlurmrestdClient):
    def setup_client(
        self,
        slurmrestd_parameters=None,
        racksdb=True,
        metrics=False,
        cache=False,
        racksdb_format_error=False,
        racksdb_schema_error=False,
        anonymous_user=False,
        anonymous_enabled=True,
        use_token=True,
    ):
        self.setup_agent_conf(
            slurmrestd_parameters=slurmrestd_parameters,
            racksdb=racksdb,
            metrics=metrics,
            cache=cache,
        )

        # Start the app with mocked RacksDB web blueprint
        with mock.patch("slurmweb.apps.agent.RacksDBWebBlueprint") as m:
            if racksdb_format_error:
                m.side_effect = RacksDBFormatError("fake db format error")
            elif racksdb_schema_error:
                m.side_effect = RacksDBSchemaError("fake db schema error")
            else:
                m.return_value = FakeRacksDBWebBlueprint()
            self.app = SlurmwebAppAgent(
                SlurmwebAppSeed.with_parameters(
                    debug=False,
                    log_flags=["ALL"],
                    log_component=None,
                    debug_flags=[],
                    conf_defs=self.conf_defs,
                    conf=self.conf.name,
                )
            )
        if not anonymous_enabled:
            self.app.policy.disable_anonymous()

        # Close conf and keys file handlers to remove temporary files
        self.conf.close()
        self.key.close()
        self.slurmrestd_key.close()

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


class RemoveActionInPolicy:
    """Context manager to temporarily remove an action from a role in policy."""

    def __init__(self, policy, role, action):
        self.policy = policy
        self.role = role
        self.action = action
        self.removed_in_anonymous = False

    def __enter__(self):
        for _role in self.policy.loader.roles:
            if _role.name == self.role:
                _role.actions.remove(self.action)
            if _role.name == ANONYMOUS_ROLE and self.action in _role.actions:
                _role.actions.remove(self.action)
                self.removed_in_anonymous = True

    def __exit__(self, exc_type, exc_val, exc_tb):
        for _role in self.policy.loader.roles:
            if _role.name == self.role:
                _role.actions.add(self.action)
            if _role.name == ANONYMOUS_ROLE and self.removed_in_anonymous:
                _role.actions.add(self.action)
