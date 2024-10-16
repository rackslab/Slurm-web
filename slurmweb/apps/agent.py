# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
import logging

from rfl.web.tokens import RFLTokenizedRBACWebApp
from racksdb.errors import RacksDBSchemaError, RacksDBFormatError
from racksdb.web.app import RacksDBWebBlueprint

from . import SlurmwebWebApp
from ..version import get_version
from ..views import SlurmwebAppRoute
from ..views import agent as views
from ..slurmrestd import SlurmrestdFilteredCached
from ..cache import CachingService
from ..db.models import create_db

logger = logging.getLogger(__name__)


class SlurmwebAppAgent(SlurmwebWebApp, RFLTokenizedRBACWebApp):
    NAME = "slurm-web-agent"
    SITE_CONFIGURATION = "/etc/slurm-web/agent.ini"
    SETTINGS_DEFINITION = "/usr/share/slurm-web/conf/agent.yml"
    VIEWS = {
        SlurmwebAppRoute("/version", views.version),
        SlurmwebAppRoute(f"/v{get_version()}/info", views.info),
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
        SlurmwebAppRoute(f"/v{get_version()}/templates", views.templates),
        SlurmwebAppRoute(f"/v{get_version()}/inputs", views.inputs),
        SlurmwebAppRoute(f"/v{get_version()}/input-types", views.input_types),
        SlurmwebAppRoute(f"/v{get_version()}/user-accounts", views.user_accounts),
        SlurmwebAppRoute(f"/v{get_version()}/user-logins", views.user_logins),
        SlurmwebAppRoute(
            f"/v{get_version()}/developer-accounts", views.developer_accounts
        ),
        SlurmwebAppRoute(f"/v{get_version()}/developer-logins", views.developer_logins),
        SlurmwebAppRoute(
            f"/v{get_version()}/create-template",
            views.create_template,
            methods=["POST"],
        ),
    }

    def __init__(self, seed):
        SlurmwebWebApp.__init__(self, seed)
        create_db(self.settings.jobtemplates.db)

        # Load RacksDB blueprint and fail with error if unable to load schema or
        # database.
        try:
            self.register_blueprint(
                RacksDBWebBlueprint(
                    db=self.settings.racksdb.db,
                    ext=self.settings.racksdb.extensions,
                    schema=self.settings.racksdb.schema,
                    drawings_schema=self.settings.racksdb.drawings_schema,
                    default_drawing_parameters={
                        "infrastructure": {"equipment_tags": self.settings.racksdb.tags}
                    },
                ),
                url_prefix="/racksdb",
            )
        except RacksDBSchemaError as err:
            logger.critical("Unable to load RacksDB schema: %s", err)
            sys.exit(1)
        except RacksDBFormatError as err:
            logger.critical("Unable to load RacksDB database: %s", err)
            sys.exit(1)

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

        self.slurmrestd = SlurmrestdFilteredCached(
            self.settings.slurmrestd.socket,
            self.settings.slurmrestd.version,
            self.settings.filters,
            self.settings.cache,
            self.cache,
        )

        # Default RacksDB infrastructure is the cluster name.
        if self.settings.racksdb.infrastructure is None:
            self.settings.racksdb.infrastructure = self.settings.service.cluster
