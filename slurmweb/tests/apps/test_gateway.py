# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
from unittest import mock

import requests

from ..lib.gateway import TestGatewayBase
from slurmweb.apps.gateway import SlurmwebAgent, version_greater_or_equal

from ..lib.utils import mock_agent_response, fake_text_response

class TestVersionComparaison(unittest.TestCase):

    def test_version_greater_or_equal(self):
        self.assertTrue(version_greater_or_equal("1.0.0", "1.0.0"))
        self.assertTrue(version_greater_or_equal("1.0.0", "2.0.0"))
        self.assertTrue(version_greater_or_equal("1.0.0", "1.1.0"))
        self.assertTrue(version_greater_or_equal("1.0.0", "1.0.1"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.9"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.9.9"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.200.100"))


class TestGatewayApp(TestGatewayBase):
    def setUp(self):
        self.setup_app()

    @mock.patch("slurmweb.apps.gateway.requests.get")
    def test_agents(self, mock_requests_get):
        agent_info, mock_requests_get.return_value = mock_agent_response("info")
        agents = self.app.agents
        # Check presence of cluster name returned by agent in agents dict property.
        self.assertIn(agent_info["cluster"], agents)
        # Check SlurmwebAgent object is instanciated with all its attributes.
        agent = agents[agent_info["cluster"]]
        self.assertIsInstance(agent, SlurmwebAgent)
        self.assertEqual(len(vars(agent)), 4)
        self.assertEqual(agent.cluster, agent_info["cluster"])
        self.assertEqual(agent.racksdb.version, agent_info["racksdb"]["version"])
        self.assertEqual(agent.racksdb.infrastructure, agent_info["racksdb"]["infrastructure"])
        self.assertEqual(agent.metrics, agent_info["metrics"])
        self.assertEqual(agent.url, self.app.settings.agents.url[0].geturl())

    @mock.patch("slurmweb.apps.gateway.requests.get")
    def test_agents_missing_key(self, mock_requests_get):
        agent_info, mock_requests_get.return_value = mock_agent_response(
            "info"
        )
        del agent_info["metrics"]
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [SlurmwebAgentError] Unable to parse cluster info "
                "fields from agent"
            ],
        )

    @mock.patch("slurmweb.apps.gateway.requests.get")
    def test_agents_unsupported_racksdb_version(self, mock_requests_get):
        agent_info, mock_requests_get.return_value = mock_agent_response(
            "info"
        )
        agent_info["racksdb"]["version"] = "0.3.0"
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unsupported RacksDB API version 0.3.0 on "
                f"agent {agent_info['cluster']}, discarding this agent"
            ],
        )

    @mock.patch("slurmweb.apps.gateway.requests.get")
    def test_agents_json_error(self, mock_requests_get):
        _, mock_requests_get.return_value = fake_text_response()
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [JSONDecodeError] Expecting value: line 1 column 1 "
                "(char 0)"
            ],
        )

    @mock.patch("slurmweb.apps.gateway.requests.get")
    def test_agents_ssl_error(self, mock_requests_get):
        mock_requests_get.side_effect = requests.exceptions.SSLError("fake SSL error")
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [SSLError] fake SSL error"
            ],
        )

    @mock.patch("slurmweb.apps.gateway.requests.get")
    def test_agents_connection_error(self, mock_requests_get):
        mock_requests_get.side_effect = requests.exceptions.ConnectionError(
            "fake connection error"
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [ConnectionError] fake connection error"
            ],
        )
