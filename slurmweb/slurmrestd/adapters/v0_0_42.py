# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import logging
from .base import BaseAdapter


logger = logging.getLogger(__name__)


class AdapterV0_0_42(BaseAdapter):
    """Adapter from API version 0.0.42 to 0.0.43.

    Differences spotted between v0.0.42 and v0.0.43 API but ignored:

    GET /slurm/v{version}/node/{node_name}
      + responses.200.properties.nodes.items.properties.cert_flags
        → not used by Slurm-web
      + responses.200.properties.nodes.items.properties.topology
        → not used by Slurm-web
      + responses.200.properties.nodes.items.properties.tls_cert_last_renewal
        → not used by Slurm-web

    GET /slurm/v{version}/nodes/
      + responses.200.properties.nodes.items.properties.cert_flags
        → not used by Slurm-web
      + responses.200.properties.nodes.items.properties.topology
        → not used by Slurm-web
      + responses.200.properties.nodes.items.properties.tls_cert_last_renewal
        → not used by Slurm-web

    GET /slurm/v{version}/partition/{partition_name}
      + responses.200.properties.partitions.items.properties.topology
        → not used by Slurm-web

    GET /slurm/v{version}/partitions/
      + responses.200.properties.partitions.items.properties.topology
        → not used by Slurm-web
    """

    def adapt_slurm_jobs(self, data: t.Any) -> t.Any:
        """
        Differences spotted between v0.0.42 and v0.0.43 API:

        GET /slurm/v{version}/jobs/
          + responses.200.properties.jobs.items.properties.licenses_allocated
            → not used by Slurm-web
          + responses.200.properties.jobs.items.properties.segment_size
            → not used by Slurm-web
          + responses.200.properties.jobs.items.properties.stderr_expanded
            → converted from standard_error
          + responses.200.properties.jobs.items.properties.stdout_expanded
            → converted from standard_output
          + responses.200.properties.jobs.items.properties.stdin_expanded
            → converted from standard_input

        GET /slurm/v{version}/job/{job_id}
          + responses.200.properties.jobs.items.properties.licenses_allocated
            → not used by Slurm-web
          + responses.200.properties.jobs.items.properties.segment_size
            → not used by Slurm-web
          + responses.200.properties.jobs.items.properties.stderr_expanded
            → converted from standard_error
          + responses.200.properties.jobs.items.properties.stdout_expanded
            → converted from standard_output
          + responses.200.properties.jobs.items.properties.stdin_expanded
            → converted from standard_input
        """
        logger.debug("running AdapterV0_0_42.adapt_slurm_jobs()")
        for job in data:
            job["stderr_expanded"] = job["standard_error"]
            job["stdin_expanded"] = job["standard_input"]
            job["stdout_expanded"] = job["standard_output"]
        return data

    def adapt_slurmdb_jobs(self, data: t.Any) -> t.Any:
        """
        Differences spotted between v0.0.42 and v0.0.43 API:

        GET /slurmdb/v{version}/job/{job_id}
          + responses.200.properties.jobs.items.properties.steps.items.properties.step.
            properties.stdout
            → initialized to empty string
          + responses.200.properties.jobs.items.properties.steps.items.properties.step.
            properties.stderr
            → initialized to empty string
          + responses.200.properties.jobs.items.properties.steps.items.properties.step.
            properties.stderr_expanded
            → initialized to empty string
          + responses.200.properties.jobs.items.properties.steps.items.properties.step.
            properties.stdout_expanded
            → initialized to empty string
          + responses.200.properties.jobs.items.properties.steps.items.properties.step.
            properties.stdin
            → initialized to empty string
          + responses.200.properties.jobs.items.properties.steps.items.properties.step.
            properties.stdin_expanded
            → initialized to empty string
          + responses.200.properties.jobs.items.properties.steps.items.properties.time.
            properties.limit
            → initialized to unset number
          + responses.200.properties.jobs.items.properties.reservation.properties.
            requested
            → not used by Slurm-web
        """
        logger.debug("running AdapterV0_0_42.adapt_slurmdb_jobs()")
        for job in data:
            for step in job["steps"]:
                step["step"]["stderr"] = ""
                step["step"]["stderr_expanded"] = ""
                step["step"]["stdin"] = ""
                step["step"]["stdin_expanded"] = ""
                step["step"]["stdout"] = ""
                step["step"]["stdout_expanded"] = ""
                step["time"]["limit"] = {
                    "set": False,
                    "infinite": True,
                    "number": 0,
                }
        return data
