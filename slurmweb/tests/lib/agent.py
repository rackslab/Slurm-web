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

from rfl.authentication.user import AuthenticatedUser
from rfl.permissions.rbac import ANONYMOUS_ROLE
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.agent import SlurmwebAppAgent
from racksdb.errors import RacksDBFormatError, RacksDBSchemaError

from .utils import (
    mock_slurmrestd_responses,
    SlurmwebCustomTestResponse,
)


CONF = """
[service]
cluster=test

[jwt]
key={key}

[policy]
definition={policy_defs}
vendor_roles={policy}
"""


class FakeRacksDBWebBlueprint(Blueprint):
    """Fake RacksDB web blueprint to avoid testing RacksDB in the scope of
    Slurm-web test cases."""

    def __init__(self, **kwargs):
        super().__init__("Fake RacksDB web blueprint", __name__)
        self.add_url_rule("/fake", view_func=self.basic)

    def basic(self):
        return jsonify({"test": "ok"})


class TestAgentBase(unittest.TestCase):

    def setup_client(
        self,
        additional_conf=None,
        racksdb_format_error=False,
        racksdb_schema_error=False,
        anonymous_user=False,
        anonymous_enabled=True,
    ):
        # Generate JWT signing key
        key = tempfile.NamedTemporaryFile(mode="w+")
        key.write("hey")
        key.seek(0)

        vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "conf", "vendor"
        )

        # Policy definition path
        policy_defs = os.path.join(vendor_path, "policy.yml")

        # Policy path
        policy = os.path.join(vendor_path, "policy.ini")

        # Generate configuration file
        conf = tempfile.NamedTemporaryFile(mode="w+")
        conf_content = CONF
        if additional_conf is not None:
            conf_content += additional_conf
        conf.write(
            conf_content.format(key=key.name, policy_defs=policy_defs, policy=policy)
        )
        conf.seek(0)

        # Configuration definition path
        conf_defs = os.path.join(vendor_path, "agent.yml")

        # Start the app with mocked RacksDB web blueprint
        with mock.patch("slurmweb.apps.agent.RacksDBWebBlueprint") as m:
            if racksdb_format_error:
                m.side_effect = RacksDBFormatError("fake db format error")
            elif racksdb_schema_error:
                m.side_effect = RacksDBSchemaError("fake db schema error")
            else:
                m.return_value = FakeRacksDBWebBlueprint()
            self.app = SlurmwebAppAgent(
                SlurmwebConfSeed(
                    debug=False,
                    log_flags=["ALL"],
                    debug_flags=[],
                    conf_defs=conf_defs,
                    conf=conf.name,
                )
            )
        if not anonymous_enabled:
            for role in self.app.policy.loader.roles.copy():
                if role.name == ANONYMOUS_ROLE:
                    self.app.policy.loader.roles.remove(role)

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
            self.user = AuthenticatedUser(
                login="anonymous", fullname="anonymous", groups=[]
            )
        else:
            self.user = AuthenticatedUser(
                login="test", fullname="Testing User", groups=["group"]
            )
        token = self.app.jwt.generate(
            user=self.user,
            duration=3600,
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
        self.client.environ_base["HTTP_AUTHORIZATION"] = "Bearer " + token

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.app.slurmrestd, slurm_version, assets)


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
            if _role.name == "anonymous" and self.action in _role.actions:
                _role.actions.remove(self.action)
                self.removed_in_anonymous = True

    def __exit__(self, exc_type, exc_val, exc_tb):
        for _role in self.policy.loader.roles:
            if _role.name == self.role:
                _role.actions.add(self.action)
            if _role.name == "anonymous" and self.removed_in_anonymous:
                _role.actions.add(self.action)
