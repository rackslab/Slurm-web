# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
import urllib
import logging

from rfl.web.tokens import RFLTokenizedRBACWebApp
from racksdb.errors import RacksDBSchemaError, RacksDBFormatError
from racksdb.web.app import RacksDBWebBlueprint

try:
    from werkzeug.middleware import dispatcher
except ModuleNotFoundError:
    # In Werkzeug < 0.15, dispatcher was not in a dedicated module, it was included in a
    # big wsgi module. This old version of werkzeug must be fully supported because it
    # is included in el8. See https://github.com/rackslab/Slurm-web/issues/419 for
    # reference.
    from werkzeug import wsgi as dispatcher

from . import SlurmwebWebApp
from ..version import get_version
from ..views import SlurmwebAppRoute
from ..views import agent as views
from ..slurmrestd import SlurmrestdFilteredCached
from ..slurmrestd.auth import SlurmrestdAuthentifier
from ..cache import CachingService
from ..errors import SlurmwebConfigurationError

logger = logging.getLogger(__name__)


class SlurmwebAppAgent(SlurmwebWebApp, RFLTokenizedRBACWebApp):
    NAME = "slurm-web-agent"
    SITE_CONFIGURATION = "/etc/slurm-web/agent.ini"
    SETTINGS_DEFINITION = "/usr/share/slurm-web/conf/agent.yml"
    VIEWS = {
        SlurmwebAppRoute("/version", views.version),
        SlurmwebAppRoute("/info", views.info),
        SlurmwebAppRoute(f"/v{get_version()}/permissions", views.permissions),
        SlurmwebAppRoute(f"/v{get_version()}/stats", views.stats),
        SlurmwebAppRoute(f"/v{get_version()}/jobs", views.jobs),
        SlurmwebAppRoute(f"/v{get_version()}/job/<int:job>", views.job),
        SlurmwebAppRoute(f"/v{get_version()}/nodes", views.nodes),
        SlurmwebAppRoute(f"/v{get_version()}/node/<name>", views.node),
        SlurmwebAppRoute(f"/v{get_version()}/partitions", views.partitions),
        SlurmwebAppRoute(f"/v{get_version()}/qos", views.qos),
        SlurmwebAppRoute(f"/v{get_version()}/reservations", views.reservations),
        SlurmwebAppRoute(f"/v{get_version()}/accounts", views.accounts),
        SlurmwebAppRoute(f"/v{get_version()}/cache/stats", views.cache_stats),
        SlurmwebAppRoute(
            f"/v{get_version()}/cache/reset", views.cache_reset, methods=["POST"]
        ),
        SlurmwebAppRoute(f"/v{get_version()}/metrics/<metric>", views.metrics),
    }

    def __init__(self, seed):
        SlurmwebWebApp.__init__(self, seed)

        # If enabled, load RacksDB blueprint and fail with error if unable to load
        # schema or database.
        if self.settings.racksdb.enabled:
            try:
                self.register_blueprint(
                    RacksDBWebBlueprint(
                        db=self.settings.racksdb.db,
                        ext=self.settings.racksdb.extensions,
                        schema=self.settings.racksdb.schema,
                        drawings_schema=self.settings.racksdb.drawings_schema,
                        default_drawing_parameters={
                            "infrastructure": {
                                "equipment_tags": self.settings.racksdb.tags
                            }
                        },
                    ),
                    url_prefix="/racksdb",
                )
            except RacksDBSchemaError as err:
                logger.error("Unable to load RacksDB schema: %s", err)
            except RacksDBFormatError as err:
                logger.error("Unable to load RacksDB database: %s", err)

        if self.settings.policy.roles.exists():
            logger.debug("Select RBAC site roles policy %s", self.settings.policy.roles)
            selected_roles_policy_path = self.settings.policy.roles
        else:
            logger.debug(
                "Select default RBAC vendor roles policy %s",
                self.settings.policy.vendor_roles,
            )
            selected_roles_policy_path = self.settings.policy.vendor_roles
        RFLTokenizedRBACWebApp.__init__(
            self,
            audience=self.settings.jwt.audience,
            algorithm=self.settings.jwt.algorithm,
            key=self.settings.jwt.key,
            policy=self.settings.policy.definition,
            roles=selected_roles_policy_path,
        )
        if self.settings.cache.enabled:
            self.cache = CachingService(
                host=self.settings.cache.host,
                port=self.settings.cache.port,
                password=self.settings.cache.password,
            )
        else:
            logger.warning("Caching is disabled")
            self.cache = None

        if self.settings.slurmrestd.socket:
            logger.warning(
                "Using deprecated parameter [slurmrestd]>socket to define "
                "[slurmrest]>uri, update your site agent configuration file"
            )
            self.settings.slurmrestd.uri = urllib.parse.urlparse(
                f"unix://{self.settings.slurmrestd.socket}"
            )

        # Warn deprecated local authentication method to slurmrestd
        if self.settings.slurmrestd.auth == "local":
            logger.warning(
                "Using deprecated slurmrestd local authentication method, it is "
                "recommended to migrate to jwt authentication"
            )

        try:
            self.slurmrestd = SlurmrestdFilteredCached(
                self.settings.slurmrestd.uri,
                SlurmrestdAuthentifier(
                    self.settings.slurmrestd.auth,
                    self.settings.slurmrestd.jwt_mode,
                    self.settings.slurmrestd.jwt_user,
                    self.settings.slurmrestd.jwt_key,
                    self.settings.slurmrestd.jwt_lifespan,
                    self.settings.slurmrestd.jwt_token,
                ),
                self.settings.slurmrestd.version,
                self.settings.filters,
                self.settings.cache,
                self.cache,
            )
        except SlurmwebConfigurationError as err:
            logger.critical("Configuration error: %s", err)
            sys.exit(1)

        # Default RacksDB infrastructure is the cluster name.
        if self.settings.racksdb.infrastructure is None:
            self.settings.racksdb.infrastructure = self.settings.service.cluster

        self.metrics_collector = None
        self.metrics_db = None
        if self.settings.metrics.enabled:
            # Lazy load metrics module to avoid failing on missing optional external
            # dependency when feature is actually disabled.
            from ..metrics.collector import SlurmWebMetricsCollector, make_wsgi_app
            from ..metrics.db import SlurmwebMetricsDB

            self.metrics_collector = SlurmWebMetricsCollector(
                self.slurmrestd, self.cache
            )
            self.wsgi_app = dispatcher.DispatcherMiddleware(
                self.wsgi_app, {"/metrics": make_wsgi_app(self.settings.metrics)}
            )
            self.metrics_db = SlurmwebMetricsDB(
                self.settings.metrics.host, self.settings.metrics.job
            )
