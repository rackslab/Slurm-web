# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
import logging

from rfl.web.tokens import RFLTokenizedRBACWebApp
from racksdb import DBSchemaError, DBFormatError
from racksdb.web.app import RacksDBWebBlueprint

from . import SlurmwebWebApp
from ..version import get_version
from ..views import SlurmwebAppRoute
from ..views import agent as views
from ..cache import CachingService

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
    }

    def __init__(self, seed):
        SlurmwebWebApp.__init__(self, seed)

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
        except DBFormatError as err:
            logger.critical("Unable to load RacksDB database: %s", err)
            sys.exit(1)
        except DBSchemaError as err:
            logger.critical("Unable to load RacksDB schema: %s", err)
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
        self.cache = CachingService(
            host=self.settings.cache.host,
            port=self.settings.cache.port,
            password=self.settings.cache.password,
        )
