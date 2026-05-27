# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import time
import collections
import asyncio
import logging
import ssl

from rfl.web.tokens import RFLTokenizedWebApp
from rfl.core.asyncio import asyncio_run
import aiohttp
from flask import Response

try:
    from werkzeug.middleware import dispatcher
except ModuleNotFoundError:
    # In Werkzeug < 0.15, dispatcher was not in a dedicated module, it was included in a
    # big wsgi module. This old version of werkzeug must be fully supported because it
    # is included in el8. See https://github.com/rackslab/Slurm-web/issues/419 for
    # reference.
    from werkzeug import wsgi as dispatcher

from urllib.parse import urljoin

from . import SlurmwebWebApp
from ..conf import load_secret_from_file
from ..ui import SlurmwebFrontend
from ..views import SlurmwebAppRoute
from ..views import gateway as views
from ..views.auth import anonymous as anonymous_views
from ..views.auth import ldap as ldap_views
from ..views.auth import oidc as oidc_views
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
    NAME = "slurm-web gateway"
    VIEWS = {
        SlurmwebAppRoute("/api/version", views.version),
        SlurmwebAppRoute("/api/login", ldap_views.login, methods=["POST"]),
        SlurmwebAppRoute("/api/oidc/login", oidc_views.oidc_login),
        SlurmwebAppRoute("/api/oidc/callback", oidc_views.oidc_callback),
        SlurmwebAppRoute("/api/oidc/session", oidc_views.oidc_session),
        SlurmwebAppRoute("/api/anonymous", anonymous_views.anonymous),
        SlurmwebAppRoute("/api/messages/login", views.message_login),
        SlurmwebAppRoute("/api/clusters", views.clusters),
        SlurmwebAppRoute("/api/users", views.users),
        SlurmwebAppRoute("/api/agents/<cluster>/ping", views.ping),
        SlurmwebAppRoute("/api/agents/<cluster>/stats", views.stats),
        SlurmwebAppRoute("/api/agents/<cluster>/metrics/<metric>", views.metrics),
        SlurmwebAppRoute("/api/agents/<cluster>/cache/stats", views.cache_stats),
        SlurmwebAppRoute(
            "/api/agents/<cluster>/cache/reset", views.cache_reset, methods=["POST"]
        ),
        SlurmwebAppRoute("/api/agents/<cluster>/jobs", views.jobs),
        SlurmwebAppRoute("/api/agents/<cluster>/job/<int:job>", views.job),
        SlurmwebAppRoute("/api/agents/<cluster>/nodes", views.nodes),
        SlurmwebAppRoute("/api/agents/<cluster>/node/<name>", views.node),
        SlurmwebAppRoute("/api/agents/<cluster>/partitions", views.partitions),
        SlurmwebAppRoute("/api/agents/<cluster>/qos", views.qos),
        SlurmwebAppRoute("/api/agents/<cluster>/reservations", views.reservations),
        SlurmwebAppRoute("/api/agents/<cluster>/accounts", views.accounts),
        SlurmwebAppRoute("/api/agents/<cluster>/associations", views.associations),
        SlurmwebAppRoute(
            "/api/agents/<cluster>/racksdb/<path:query>",
            views.racksdb,
            methods=["GET", "POST"],
        ),
    }

    def __init__(self, seed):
        SlurmwebWebApp.__init__(self, seed)

        # Use templates in UI templates folder
        self.set_templates_folder(self.settings.ui.templates)

        # Configure Flask session
        self._configure_session()

        # Setup authentifier
        if self.settings.authentication.enabled:
            if self.settings.authentication.method == "ldap":
                self._setup_ldap_authentifier()
            elif self.settings.authentication.method == "oidc":
                self._setup_oidc_authentifier()
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

        # Mount application under URL prefix if configured
        self.prefix = self._infer_ui_prefix()
        self._mount_under_prefix(self.prefix)

        # Add UI rules if enabled.
        self.frontend = None
        if self.settings.ui.enabled:
            self.frontend = SlurmwebFrontend(self.settings.ui)
            self.frontend.validate()
            ui_path = self.frontend.prepare_assets(self.prefix)
            self.add_url_rule("/config.json", view_func=views.ui_config)
            self.static_folder = str(ui_path)
            self.add_url_rule("/", view_func=views.ui_files)
            self.add_url_rule("/<path:name>", view_func=views.ui_files)

        self._agents = {}
        self._agents_timeout = 0

    def get_agent_connector(self):
        """Return a TCPConnector configured for agent connections with custom CA if
        configured, or None if no custom CA is configured."""
        if not self.settings.agents.cacert:
            return None

        if not self.settings.agents.cacert.is_file():
            raise SlurmwebConfigurationError(
                f"Agent CA certificate file {self.settings.agents.cacert} not found"
            )
        return aiohttp.TCPConnector(
            ssl=ssl.create_default_context(cafile=str(self.settings.agents.cacert))
        )

    async def _get_agent_info(self, url) -> SlurmwebAgent:
        """Retrieve information from one agent, check values and return SlurmwebAgent
        object if checks pass. Return None on error."""
        try:
            logger.info("Retrieving info from agent at url %s", url)
            async with aiohttp.ClientSession(
                connector=self.get_agent_connector()
            ) as session:
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

    def _infer_ui_prefix(self) -> str:
        """Infer the UI URL prefix from configured UI public host."""
        host = self.settings.ui.host
        if host is None:
            return ""
        normalized = host.path.rstrip("/")
        return normalized

    def _configure_session(self):
        """Load the gateway session secret and harden Flask session cookies.

        Reads service.session_key into SECRET_KEY and sets session cookie
        options (HttpOnly, SameSite Lax, Secure when ui.host uses HTTPS).
        Used for server-side sessions such as OIDC OAuth state and login handoff.
        """
        session_key = load_secret_from_file(
            self.settings.service.session_key,
            "Session key",
        )
        if not session_key:
            raise SlurmwebConfigurationError(
                f"Session key file {self.settings.service.session_key} is required"
            )
        # Signs and encrypts the server-side session cookie.
        self.config["SECRET_KEY"] = session_key
        host = self.settings.ui.host
        # Harden the session cookie sent to the browser for those server-side sessions.
        # HttpOnly: JavaScript cannot read the cookie, which limits exfiltration if the
        #   UI is compromised by XSS (the session still holds sensitive handoff data).
        # SameSite=Lax: blocks cross-site POST requests from carrying the cookie (CSRF)
        #   while still sending it on top-level GET navigations, which is required when
        #   the identity provider redirects the browser back to /api/oidc/callback.
        # Secure: send the cookie only over HTTPS when ui.host uses the https scheme,
        #   so it is not exposed on plaintext HTTP in production-like deployments.
        self.config.update(
            SESSION_COOKIE_HTTPONLY=True,
            SESSION_COOKIE_SAMESITE="Lax",
            SESSION_COOKIE_SECURE=host is not None and host.scheme == "https",
        )

    def _setup_ldap_authentifier(self):
        """Instantiate LDAPAuthentifier from gateway ldap settings."""
        from rfl.authentication.ldap import LDAPAuthentifier

        bind_password = (
            load_secret_from_file(
                self.settings.ldap.bind_password_file, "LDAP bind password"
            )
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

    def _oidc_redirect_uri(self) -> str:
        if self.settings.oidc.redirect_uri is not None:
            return self.settings.oidc.redirect_uri.geturl()
        host = self.settings.ui.host
        if host is None:
            raise SlurmwebConfigurationError(
                "ui.host must be defined when oidc.redirect_uri is not set"
            )
        return urljoin(host.geturl(), "api/oidc/callback")

    def _setup_oidc_authentifier(self):
        """Instantiate OIDCClient from gateway oidc settings.

        Flask session must already be configured by _configure_session().
        """
        try:
            from rfl.authentication.errors import OIDCAuthenticationError
            from rfl.authentication.oidc import OIDCClient
        except (ImportError, AttributeError) as err:
            raise SlurmwebConfigurationError(
                "OIDC authentication is not available, install "
                "RFL.authentication with OIDC support"
            ) from err

        client_secret = (
            load_secret_from_file(
                self.settings.oidc.client_secret_file,
                "OIDC client secret",
            )
            or self.settings.oidc.client_secret
        )
        if client_secret == "":
            client_secret = None
        groups_claim = self.settings.oidc.groups_claim
        if groups_claim == "":
            groups_claim = None
        try:
            self.authentifier = OIDCClient(
                self,
                issuer=self.settings.oidc.issuer.geturl(),
                client_id=self.settings.oidc.client_id,
                redirect_uri=self._oidc_redirect_uri(),
                client_secret=client_secret,
                scope=self.settings.oidc.scope,
                subject_claim=self.settings.oidc.subject_claim,
                fullname_claim=self.settings.oidc.fullname_claim,
                groups_claim=groups_claim,
                restricted_groups=self.settings.oidc.restricted_groups,
                pkce=self.settings.oidc.pkce,
                verify_ssl=self.settings.oidc.verify_ssl,
                cacert=self.settings.oidc.cacert,
            )
        except OIDCAuthenticationError as err:
            raise SlurmwebConfigurationError(str(err)) from err

    def _mount_under_prefix(self, prefix: str):
        """Wrap the application endpoints under the provided URL prefix."""
        if prefix == "":
            return
        logger.info("Mounting application under URL prefix %s", prefix)
        self.wsgi_app = dispatcher.DispatcherMiddleware(
            Response("Not Found", status=404),
            {prefix: self.wsgi_app},
        )
