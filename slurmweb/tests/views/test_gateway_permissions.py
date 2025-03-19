# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from unittest import mock

from slurmweb.version import get_version
from slurmweb.apps.gateway import SlurmwebAgent, SlurmwebAgentRacksDBSettings

from ..lib.gateway import TestGatewayBase


class TestGatewayPermissions(TestGatewayBase):
    def test_access_auth(self):
        self.setup_app()
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web gateway v{get_version()}\n")

    def test_access_anonymous(self):
        self.setup_app(anonymous_user=True)
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web gateway v{get_version()}\n")

    def test_access_no_token(self):
        self.setup_app(use_token=False)
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web gateway v{get_version()}\n")

    @mock.patch(
        "slurmweb.apps.gateway.SlurmwebAppGateway.agents",
        new_callable=mock.PropertyMock,
    )
    @mock.patch("slurmweb.views.gateway.proxy_agent")
    def test_restricted_access_auth(self, mock_proxy_agent, mock_agents):
        self.setup_app()
        mock_agents.return_value = {
            "tiny": SlurmwebAgent(
                "tiny",
                SlurmwebAgentRacksDBSettings(True, "0.4.0", "tiny"),
                True,
                "http://localhost",
            )
        }
        mock_proxy_agent.return_value = self.app.response_class(
            response='"fake agent response"', status=200, mimetype="application/json"
        )
        response = self.client.get("/api/agents/tiny/jobs")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, "fake agent response")

    @mock.patch(
        "slurmweb.apps.gateway.SlurmwebAppGateway.agents",
        new_callable=mock.PropertyMock,
    )
    @mock.patch("slurmweb.views.gateway.proxy_agent")
    def test_restricted_access_anonymous(self, mock_proxy_agent, mock_agents):
        self.setup_app(anonymous_user=True)
        mock_agents.return_value = {
            "tiny": SlurmwebAgent(
                "tiny",
                SlurmwebAgentRacksDBSettings(True, "0.4.0", "tiny"),
                True,
                "http://localhost",
            )
        }
        mock_proxy_agent.return_value = self.app.response_class(
            response='"fake agent response"', status=200, mimetype="application/json"
        )
        response = self.client.get("/api/agents/tiny/jobs")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, "fake agent response")

    @mock.patch(
        "slurmweb.apps.gateway.SlurmwebAppGateway.agents",
        new_callable=mock.PropertyMock,
    )
    @mock.patch("slurmweb.views.gateway.proxy_agent")
    def test_restricted_access_no_token(self, mock_proxy_agent, mock_agents):
        self.setup_app(use_token=False)
        mock_agents.return_value = {
            "tiny": SlurmwebAgent(
                "tiny",
                SlurmwebAgentRacksDBSettings(True, "0.4.0", "tiny"),
                True,
                "http://localhost",
            )
        }
        mock_proxy_agent.return_value = self.app.response_class(
            response='"fake agent response"', status=200, mimetype="application/json"
        )
        response = self.client.get("/api/agents/tiny/jobs")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json,
            {
                "code": 403,
                "description": ("Not allowed to access endpoint without bearer token"),
                "name": "Forbidden",
            },
        )
