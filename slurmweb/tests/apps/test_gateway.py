# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import sys
import unittest
from unittest import mock
import tempfile

import aiohttp.client_exceptions
import aiohttp

from ..lib.gateway import TestGatewayBase
from slurmweb.apps.gateway import (
    SlurmwebAgent,
    SlurmwebAppGateway,
    version_greater_or_equal,
)
from slurmweb.apps import SlurmwebAppSeed
from slurmweb.errors import SlurmwebConfigurationError

from ..lib.utils import mock_agent_aio_response


class TestVersionComparaison(unittest.TestCase):
    def test_version_greater_or_equal(self):
        self.assertTrue(version_greater_or_equal("1.0.0", "1.0.0"))
        self.assertTrue(version_greater_or_equal("1.0.0", "2.0.0"))
        self.assertTrue(version_greater_or_equal("1.0.0", "1.1.0"))
        self.assertTrue(version_greater_or_equal("1.0.0", "1.0.1"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.9"))
        self.assertFalse(version_greater_or_equal("1.0.0", "1.0"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.9.9"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.200.100"))
        self.assertTrue(version_greater_or_equal("1.0.0", "1.0.0+beta2"))
        self.assertFalse(version_greater_or_equal("1.0.0", "0.9.0~dev1"))


class TestGatewayApp(TestGatewayBase):
    def setUp(self):
        self.setup_app()

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents(self, mock_get):
        agent_info, mock_get.return_value = mock_agent_aio_response(asset="info")
        agents = self.app.agents
        # Check presence of cluster name returned by agent in agents dict property.
        self.assertIn(agent_info["cluster"], agents)
        # Check SlurmwebAgent object is instanciated with all its attributes.
        agent = agents[agent_info["cluster"]]
        self.assertIsInstance(agent, SlurmwebAgent)
        self.assertEqual(len(vars(agent)), 6)
        self.assertEqual(agent.cluster, agent_info["cluster"])
        self.assertEqual(agent.racksdb.enabled, agent_info["racksdb"]["enabled"])
        self.assertEqual(agent.racksdb.version, agent_info["racksdb"]["version"])
        self.assertEqual(
            agent.racksdb.infrastructure, agent_info["racksdb"]["infrastructure"]
        )
        self.assertEqual(agent.metrics, agent_info["metrics"])
        self.assertEqual(agent.cache, agent_info["cache"])
        self.assertEqual(agent.version, agent_info["version"])
        self.assertEqual(agent.url, self.app.settings.agents.url[0].geturl())

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_missing_key(self, mock_get):
        agent_info, mock_get.return_value = mock_agent_aio_response(asset="info")
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

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_unsupported_version(self, mock_get):
        agent_info, mock_get.return_value = mock_agent_aio_response(asset="info")
        agent_info["version"] = "0.4.0"
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unsupported Slurm-web agent API version "
                f"0.4.0 on agent {agent_info['cluster']}, discarding this agent"
            ],
        )

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_unsupported_racksdb_version(self, mock_get):
        agent_info, mock_get.return_value = mock_agent_aio_response(asset="info")
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

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_ignore_unsupported_racksdb_version(self, mock_get):
        agent_info, mock_get.return_value = mock_agent_aio_response(asset="info")
        agent_info["racksdb"]["enabled"] = False
        agent_info["racksdb"]["version"] = "0.3.0"
        # Version of RacksDB is not supported and it is also disabled. No error log
        # must be emitted in this case. Note that assertNoLogs is available starting
        # from Python 3.10. For versions below, absence of logs is not checked.
        if sys.version_info < (3, 10):
            agents = self.app.agents
        else:
            with self.assertNoLogs("slurmweb", level="ERROR"):
                agents = self.app.agents
        # Check presence of cluster name returned by agent in agents dict property.
        self.assertIn(agent_info["cluster"], agents)

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_json_error(self, mock_get):
        mock_get.side_effect = aiohttp.client_exceptions.ContentTypeError(
            aiohttp.client_reqrep.RequestInfo("http://localhost/info", "GET", {}), ()
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [ContentTypeError] 0, message='', "
                "url='http://localhost/info'"
            ],
        )

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_certificate_error(self, mock_get):
        mock_get.side_effect = (
            aiohttp.client_exceptions.ClientConnectorCertificateError(
                aiohttp.client_reqrep.ConnectionKey(
                    host="localhost",
                    port=443,
                    is_ssl=True,
                    ssl=True,
                    proxy=None,
                    proxy_auth=None,
                    proxy_headers_hash=None,
                ),
                ConnectionError("fake certificate error"),
            )
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [ClientConnectorCertificateError] Cannot connect to "
                "host localhost:443 ssl:True [ConnectionError: "
                "('fake certificate error',)]"
            ],
        )

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_ssl_error(self, mock_get):
        # In aiohttp, this PR https://github.com/aio-libs/aiohttp/pull/7698 landed in
        # v3.9.2 changes result of str(ClientConnectorSSLError). We use different input
        # value whether current version is greater or lower to this version in order to
        # get the same output eventually.
        if tuple([int(digit) for digit in aiohttp.__version__.split(".")[:3]]) < (
            3,
            9,
            2,
        ):
            _ssl = None
        else:
            _ssl = True
        mock_get.side_effect = aiohttp.client_exceptions.ClientConnectorSSLError(
            aiohttp.client_reqrep.ConnectionKey(
                host="localhost",
                port=443,
                is_ssl=True,
                ssl=_ssl,
                proxy=None,
                proxy_auth=None,
                proxy_headers_hash=None,
            ),
            ConnectionError("fake SSL error"),
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [ClientConnectorSSLError] Cannot connect to host "
                "localhost:443 ssl:default [None]"
            ],
        )

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_connection_error(self, mock_get):
        mock_get.side_effect = aiohttp.client_exceptions.ClientConnectionError(
            "fake connection error"
        )
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [ClientConnectionError] fake connection error"
            ],
        )

    @mock.patch("slurmweb.views.gateway.aiohttp.ClientSession.get")
    def test_agents_unexpected_status(self, mock_get):
        _, mock_get.return_value = mock_agent_aio_response(status=404, content="fail")
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            agents = self.app.agents
        self.assertEqual(agents, {})
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.gateway:Unable to retrieve agent info from url "
                "http://localhost: [SlurmwebAgentError] unexpected status code 404"
            ],
        )


class TestGatewayAppAgentConnector(TestGatewayBase):
    @mock.patch("slurmweb.apps.gateway.ssl.create_default_context")
    @mock.patch("slurmweb.apps.gateway.aiohttp.TCPConnector")
    def test_agent_connector(self, mock_connector, mock_context):
        with tempfile.NamedTemporaryFile(mode="w") as cacert:
            mock_context.return_value = mock.sentinel.agent_ssl_context
            mock_connector.return_value = mock.sentinel.agent_connector
            self.setup_app(conf_overrides={"agents_extra": {"cacert": cacert.name}})
            connector = self.app.get_agent_connector()
            self.assertIs(connector, mock.sentinel.agent_connector)
            mock_context.assert_called_once_with(cafile=cacert.name)
            mock_connector.assert_called_once_with(ssl=mock.sentinel.agent_ssl_context)

    def test_agent_connector_no_cacert(self):
        self.setup_app()
        connector = self.app.get_agent_connector()
        self.assertIsNone(connector)

    def test_agent_connector_missing_cacert_file(self):
        self.setup_gateway_conf(agents_extra={"cacert": "/dev/fail"})
        app = SlurmwebAppGateway(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
            )
        )
        with self.assertRaisesRegex(
            SlurmwebConfigurationError,
            r"^Agent CA certificate file /dev/fail not found$",
        ):
            app.get_agent_connector()
