# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import json
import logging

from rfl.web.tokens import RFLTokenizedWebApp
from rfl.authentication.ldap import LDAPAuthentifier
import requests

from . import SlurmwebWebApp
from ..views import SlurmwebAppRoute
from ..views import gateway as views
from ..errors import SlurmwebConfigurationError

logger = logging.getLogger(__name__)


class SlurmwebAgent:
    def __init__(self, cluster, url):
        self.cluster = cluster
        self.url = url

    @classmethod
    def from_json(cls, url, data):
        return cls(data["cluster"], url)


class SlurmwebAppGateway(SlurmwebWebApp, RFLTokenizedWebApp):

    NAME = "slurm-web-gateway"
    SITE_CONFIGURATION = "/etc/slurm-web/gateway.ini"
    SETTINGS_DEFINITION = "/usr/share/slurm-web/conf/gateway.yml"
    VIEWS = {
        SlurmwebAppRoute("/version", views.version),
        SlurmwebAppRoute("/login", views.login, methods=["POST"]),
        SlurmwebAppRoute("/clusters", views.clusters),
        SlurmwebAppRoute("/users", views.users),
        SlurmwebAppRoute("/agents/<cluster>/stats", views.stats),
        SlurmwebAppRoute("/agents/<cluster>/jobs", views.jobs),
        SlurmwebAppRoute("/agents/<cluster>/job/<int:job>", views.job),
        SlurmwebAppRoute("/agents/<cluster>/nodes", views.nodes),
        SlurmwebAppRoute("/agents/<cluster>/node/<name>", views.node),
        SlurmwebAppRoute("/agents/<cluster>/partitions", views.partitions),
        SlurmwebAppRoute("/agents/<cluster>/qos", views.qos),
        SlurmwebAppRoute("/agents/<cluster>/reservations", views.reservations),
        SlurmwebAppRoute("/agents/<cluster>/accounts", views.accounts),
        SlurmwebAppRoute(
            "/agents/<cluster>/racksdb/<path:query>",
            views.racksdb,
            methods=["GET", "POST"],
        ),
    }

    def __init__(self, seed):
        SlurmwebWebApp.__init__(self, seed)
        if self.settings.authentication.method == "ldap":
            self.authentifier = LDAPAuthentifier(
                uri=self.settings.ldap.uri,
                cacert=self.settings.ldap.cacert,
                user_base=self.settings.ldap.user_base,
                user_class=self.settings.ldap.user_class,
                group_base=self.settings.ldap.group_base,
                user_fullname_attribute=self.settings.ldap.user_fullname_attribute,
                group_name_attribute=self.settings.ldap.group_name_attribute,
                starttls=self.settings.ldap.starttls,
                bind_dn=self.settings.ldap.bind_dn,
                bind_password=self.settings.ldap.bind_password,
                restricted_groups=self.settings.ldap.restricted_groups,
            )
        else:
            raise SlurmwebConfigurationError(
                f"Unsupport authentication method {self.settings.authentication.method}"
            )
        RFLTokenizedWebApp.__init__(
            self,
            audience=self.settings.jwt.audience,
            algorithm=self.settings.jwt.algorithm,
            key=self.settings.jwt.key,
        )
        # Setup frontend application and add corresponding routes if UI is enabled.
        if self.settings.ui.enabled:
            # Generate config.json used by frontend application
            ui_config = {
                "API_SERVER": (
                    self.settings.ui.host.geturl()
                    if self.settings.ui.host is not None
                    else f"http://localhost:{self.settings.service.port}"
                ),
            }
            with open(self.settings.ui.path.joinpath("config.json"), "w+") as fh:
                fh.write(json.dumps(ui_config))
            self.static_folder = self.settings.ui.path
            self.add_url_rule("/", view_func=views.ui_index)
            self.add_url_rule("/<path:name>", view_func=views.ui_files)
        # Get information from all agents
        self.agents = {}
        for url in self.settings.agents.url:
            try:
                logger.info("Retrieving info from agent at url %s", url.geturl())
                agent = self._agent_info(url.geturl())
            except (
                requests.exceptions.ConnectionError,
                requests.exceptions.JSONDecodeError,
            ) as err:
                logger.error(
                    "Unable to retrieve agent info from url %s: [%s] %s",
                    url.geturl(),
                    type(err).__name__,
                    str(err),
                )
            else:
                logger.debug(
                    "Discovered available agent for cluster %s at url %s",
                    agent.cluster,
                    url.geturl(),
                )
                self.agents[agent.cluster] = agent

    def _agent_info(self, url: str) -> SlurmwebAgent:
        response = requests.get(f"{url}/v{self.settings.agents.version}/info")
        return SlurmwebAgent.from_json(url, response.json())
