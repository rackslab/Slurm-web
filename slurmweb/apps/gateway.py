# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import time
import collections
import asyncio
import logging

from rfl.web.tokens import RFLTokenizedWebApp
from rfl.authentication.ldap import LDAPAuthentifier
from rfl.core.asyncio import asyncio_run
import aiohttp

from . import SlurmwebWebApp, load_ldap_password_from_file
from ..views import SlurmwebAppRoute
from ..views import gateway as views
from ..errors import (
    SlurmwebConfigurationError,
    SlurmwebAgentError,
)

logger = logging.getLogger(__name__)


SlurmwebAgentRacksDBSettings = collections.namedtuple(
    "SlurmwebAgentRacksDBSettings", ["enabled", "version", "infrastructure"]
)


class SlurmwebAgent:
    def __init__(
        self,
        version: str,
        cluster: str,
        racksdb: SlurmwebAgentRacksDBSettings,
        metrics: bool,
        cache: bool,
        url: str,
    ):
        self.version = version
        self.cluster = cluster
        self.metrics = metrics
        self.cache = cache
        self.racksdb = racksdb
        self.url = url

    @classmethod
    def from_json(cls, url, data):
        try:
            return cls(
                data["version"],
                data["cluster"],
                SlurmwebAgentRacksDBSettings(**data["racksdb"]),
                data["metrics"],
                data["cache"],
                url,
            )
        except KeyError as err:
            raise SlurmwebAgentError(
                "Unable to parse cluster info fields from agent"
            ) from err


def version_greater_or_equal(reference_s: str, version_s: str) -> bool:
    """Return True if provided version is greater or equal than reference version."""

    def int_or_str(part):
        try:
            return int(part)
        except ValueError:
            return part

    def version_tuple(version):
        return tuple(int_or_str(part) for part in version.split("."))

    def compare(reference, version):
        comparable_parts = min(len(reference), len(version))
        n = 0
        # skip identical parts
        while n < comparable_parts and reference[n] == version[n]:
            n += 1
        if n == comparable_parts:
            if len(version) >= len(reference):
                return True
            return False
        if isinstance(reference[n], int) and isinstance(version[n], int):
            return version[n] >= reference[n]
        return str(version[n]) >= str(reference[n])

    return compare(version_tuple(reference_s), version_tuple(version_s))


class SlurmwebAppGateway(SlurmwebWebApp, RFLTokenizedWebApp):
    NAME = "slurm-web-gateway"
    SITE_CONFIGURATION = "/etc/slurm-web/gateway.ini"
    SETTINGS_DEFINITION = "/usr/share/slurm-web/conf/gateway.yml"
    VIEWS = {
        SlurmwebAppRoute("/api/version", views.version),
        SlurmwebAppRoute("/api/login", views.login, methods=["POST"]),
        SlurmwebAppRoute("/api/anonymous", views.anonymous),
        SlurmwebAppRoute("/api/messages/login", views.message_login),
        SlurmwebAppRoute("/api/clusters", views.clusters),
        SlurmwebAppRoute("/api/users", views.users),
        SlurmwebAppRoute("/api/agents/<cluster>/stats", views.stats),
        SlurmwebAppRoute("/api/agents/<cluster>/metrics/<metric>", views.metrics),
        SlurmwebAppRoute("/api/agents/<cluster>/cache/stats", views.cache_stats),
        SlurmwebAppRoute("/api/agents/<cluster>/jobs", views.jobs),
        SlurmwebAppRoute("/api/agents/<cluster>/job/<int:job>", views.job),
        SlurmwebAppRoute("/api/agents/<cluster>/nodes", views.nodes),
        SlurmwebAppRoute("/api/agents/<cluster>/node/<name>", views.node),
        SlurmwebAppRoute("/api/agents/<cluster>/partitions", views.partitions),
        SlurmwebAppRoute("/api/agents/<cluster>/qos", views.qos),
        SlurmwebAppRoute("/api/agents/<cluster>/reservations", views.reservations),
        SlurmwebAppRoute("/api/agents/<cluster>/accounts", views.accounts),
        SlurmwebAppRoute(
            "/api/agents/<cluster>/racksdb/<path:query>",
            views.racksdb,
            methods=["GET", "POST"],
        ),
    }

    async def _get_agent_info(self, url) -> SlurmwebAgent:
        """Retrieve information from one agent, check values and return SlurmwebAgent
        object if checks pass. Return None on error."""
        try:
            logger.info("Retrieving info from agent at url %s", url)
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/info") as response:
                    if response.status != 200:
                        raise SlurmwebAgentError(
                            f"unexpected status code {response.status}"
                        )
                    agent = SlurmwebAgent.from_json(url, await response.json())
        except (
            SlurmwebAgentError,
            aiohttp.client_exceptions.ClientConnectionError,
            aiohttp.client_exceptions.ContentTypeError,
        ) as err:
            logger.error(
                "Unable to retrieve agent info from url %s: [%s] %s",
                url,
                type(err).__name__,
                str(err),
            )
            return None

        # Check agent version is greater or equal than minimal version specified
        # in configuration.
        if not version_greater_or_equal(self.settings.agents.version, agent.version):
            logger.error(
                "Unsupported Slurm-web agent API version %s on agent %s, "
                "discarding this agent",
                agent.version,
                agent.cluster,
            )
            return None
        # If RacksDB is enabled on agent, check its version is greater or equal
        # than minimal version specified in configuration.
        if agent.racksdb.enabled and not version_greater_or_equal(
            self.settings.agents.racksdb_version, agent.racksdb.version
        ):
            logger.error(
                "Unsupported RacksDB API version %s on agent %s, discarding this agent",
                agent.racksdb.version,
                agent.cluster,
            )
            return None
        logger.debug(
            "Discovered available agent for cluster %s at url %s",
            agent.cluster,
            url,
        )
        return agent

    async def _get_agents_info(self):
        """Return the list of available clusters SlurmwebAgent. Agents on which request
        failed are filtered out."""
        return {
            agent.cluster: agent
            for agent in await asyncio.gather(
                *[
                    self._get_agent_info(url.geturl())
                    for url in self.settings.agents.url
                ]
            )
            if agent is not None
        }

    @property
    def agents(self):
        """Get agents information dictionnary. If the cache timeout is not reached,
        return the _agent property without modification. Else, poll all agents declared
        in configuration to get information from them, re-initialize _agents property
        with new retrieved values and return it."""

        if int(time.time()) < self._agents_timeout:
            return self._agents

        self._agents = asyncio_run(self._get_agents_info())
        # Set new agents information timeout
        self._agents_timeout = int(time.time()) + 300

        return self._agents

    def __init__(self, seed):
        SlurmwebWebApp.__init__(self, seed)

        # Use templates in UI templates folder
        self.set_templates_folder(self.settings.ui.templates)

        # Setup authentifier
        if self.settings.authentication.enabled:
            if self.settings.authentication.method == "ldap":
                bind_password = (
                    load_ldap_password_from_file(self.settings.ldap.bind_password_file)
                    or self.settings.ldap.bind_password
                )
                self.authentifier = LDAPAuthentifier(
                    uri=self.settings.ldap.uri,
                    user_base=self.settings.ldap.user_base,
                    group_base=self.settings.ldap.group_base,
                    user_class=self.settings.ldap.user_class,
                    user_name_attribute=self.settings.ldap.user_name_attribute,
                    user_fullname_attribute=self.settings.ldap.user_fullname_attribute,
                    user_primary_group_attribute=self.settings.ldap.user_primary_group_attribute,
                    group_name_attribute=self.settings.ldap.group_name_attribute,
                    group_object_classes=self.settings.ldap.group_object_classes,
                    cacert=self.settings.ldap.cacert,
                    starttls=self.settings.ldap.starttls,
                    bind_dn=self.settings.ldap.bind_dn,
                    bind_password=bind_password,
                    restricted_groups=self.settings.ldap.restricted_groups,
                    lookup_user_dn=self.settings.ldap.lookup_user_dn,
                    lookup_as_user=self.settings.ldap.lookup_as_user,
                )
            else:
                raise SlurmwebConfigurationError(
                    "Unsupport authentication method "
                    f"{self.settings.authentication.method}"
                )
        else:
            self.authentifier = None

        RFLTokenizedWebApp.__init__(
            self,
            audience=self.settings.jwt.audience,
            algorithm=self.settings.jwt.algorithm,
            key=self.settings.jwt.key,
        )
        # Add UI rules if enabled.
        if self.settings.ui.enabled:
            self.add_url_rule("/config.json", view_func=views.ui_config)
            self.static_folder = self.settings.ui.path
            self.add_url_rule("/", view_func=views.ui_files)
            self.add_url_rule("/<path:name>", view_func=views.ui_files)

        self._agents = {}
        self._agents_timeout = 0
