# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging
from .base import BaseAdapter


logger = logging.getLogger(__name__)


class AdapterV0_0_43(BaseAdapter):
    """Adapter from API version 0.0.43 to 0.0.44.

    Differences spotted between v0.0.43 and v0.0.44 API but ignored:

    GET /slurm/v{version}/job/{job_id}
      + responses.200.properties.jobs.items.properties.step_id
        → not used by Slurm-web
      + responses.200.properties.jobs.items.properties.submit_line
        → not used by Slurm-web (obtained from slurmdb/job/{job_id})

    GET /slurm/v{version}/jobs/
      + responses.200.properties.jobs.items.properties.step_id
        → not used by Slurm-web
      + responses.200.properties.jobs.items.properties.submit_line
        → not used by Slurm-web

    GET /slurmdb/v{version}/jobs/
      + parameters.job_altered
        → not used by Slurm-web
    """
