# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import logging
from .base import BaseAdapter


logger = logging.getLogger(__name__)


class AdapterV0_0_41(BaseAdapter):
    """Adapter from API version 0.0.41 to 0.0.42.

    Differences spotted between v0.0.41 and v0.0.42 API but ignored:

    GET /slurm/v{version}/job/{job_id}
      - responses.200.properties.jobs.items.properties.minimum_switches
        → not used by Slurm-web
      - responses.200.properties.jobs.items.properties.oversubscribe
        → not used by Slurm-web
      - responses.200.properties.jobs.items.properties.exclusive
        → replaced by shared property, not used anymore in Slurm-web
      - responses.200.properties.jobs.items.properties.show_flags
        → not used by Slurm-web
      + responses.200.properties.jobs.items.properties.priority_by_partition
        → not used by Slurm-web
      + responses.200.properties.jobs.items.properties.required_switches
        → not used by Slurm-web

    GET /slurmdb/v{version}/job/{job_id}
      + responses.200.properties.jobs.items.properties.restart_cnt
        → not used by Slurm-web
      + responses.200.properties.jobs.items.properties.qosreq
        → not used by Slurm-web

    GET /slurmdb/v{version}/jobs/
      + responses.200.properties.jobs.items.properties.restart_cnt
        → not used by Slurm-web
      + responses.200.properties.jobs.items.properties.qosreq
        → not used by Slurm-web
    """

    def adapt_slurmdb_qos(self, data: t.Any) -> t.Any:
        """
        Differences spotted between v0.0.41 and v0.0.42 API:

        GET /slurmdb/v{version}/qos/
          + responses.200.properties.qos.items.properties.limits.properties.max.
            properties.jobs.properties.count
            → initialized to unset number
          + responses.200.properties.qos.items.properties.limits.properties.max.
            properties.tres.properties.minutes.properties.total
            → initialized to empty list
          - parameters.with_deleted
            → not used by Slurm-web
          + parameters.Include deleted QOS
            → not used by Slurm-web
        """
        logger.debug("running AdapterV0_0_41.adapt_slurmdb_qos()")
        for qos in data:
            qos["limits"]["max"]["jobs"]["count"] = {
                "infinite": True,
                "number": 0,
                "set": False,
            }
            qos["limits"]["max"]["tres"]["minutes"]["total"] = []

        return data
