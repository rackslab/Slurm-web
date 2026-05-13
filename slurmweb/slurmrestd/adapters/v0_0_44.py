# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging
from .base import BaseAdapter


logger = logging.getLogger(__name__)


class AdapterV0_0_44(BaseAdapter):
    """Adapter from API version 0.0.44 to 0.0.45.

    Differences spotted between v0.0.44 and v0.0.45 API but ignored:

    DELETE /slurm/v{version}/partition/{partition_name}
    + endpoint
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/conf
    + endpoint
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/job/{job_id}
    - responses.200.properties.jobs.items.properties.power
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.memory_update_margin
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.memory_update_delay
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.container_type
      → not used by Slurm-web

    GET /slurm/v{version}/job/{job_id}/requeue
    + endpoint
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/jobs/
    - responses.200.properties.jobs.items.properties.power
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.memory_update_margin
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.memory_update_delay
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.container_type
      → not used by Slurm-web

    GET /slurm/v{version}/jobs/state/
    - responses.200.properties.jobs.items.properties.power
    + responses.200.properties.jobs.items.properties.memory_update_margin
    + responses.200.properties.jobs.items.properties.memory_update_delay
    + responses.200.properties.jobs.items.properties.container_type
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/node/{node_name}
    - responses.200.properties.nodes.items.properties.power
      → not used by Slurm-web
    - responses.200.properties.nodes.items.properties.external_sensors
      → not used by Slurm-web
    + responses.200.properties.nodes.items.properties.suspend_time
      → not used by Slurm-web

    GET /slurm/v{version}/nodes/
    - responses.200.properties.nodes.items.properties.power
      → not used by Slurm-web
    - responses.200.properties.nodes.items.properties.external_sensors
      → not used by Slurm-web
    + responses.200.properties.nodes.items.properties.suspend_time
      → not used by Slurm-web

    GET /slurm/v{version}/partition/{partition_name}
    + responses.200.properties.partitions.items.properties.preempt_mode
    + responses.200.properties.partitions.items.properties.flags
    ~ responses.200.properties.partitions.items.properties.cpus.properties.task_binding
      .type (integer → array[string])
    + responses.200.properties.partitions.items.properties.cpus.properties.task_binding
      .items
    + responses.200.properties.partitions.items.properties.partition.properties
      .oversubscribe
    + responses.200.properties.partitions.items.properties.partition.properties
      .exclusive
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/partitions/
    + responses.200.properties.partitions.items.properties.preempt_mode
    + responses.200.properties.partitions.items.properties.flags
    ~ responses.200.properties.partitions.items.properties.cpus.properties.task_binding
      .type (integer → array[string])
    + responses.200.properties.partitions.items.properties.cpus.properties.task_binding
      .items
    + responses.200.properties.partitions.items.properties.partition.properties
      .oversubscribe
    + responses.200.properties.partitions.items.properties.partition.properties
      .exclusive
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/ping/
    + responses.200.properties.pings.items.properties.status
      → not used by Slurm-web

    GET /slurm/v{version}/reservation/{reservation_name}
    - responses.200.properties.reservations.items.properties.watts
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/reservations/
    - responses.200.properties.reservations.items.properties.watts
      → not used by Slurm-web

    GET /slurmdb/v{version}/cluster/{cluster_name}
    - responses.200.properties.clusters.items.properties.select_plugin
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/clusters/
    - responses.200.properties.clusters.items.properties.select_plugin
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/conf
    + endpoint
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/config
    - responses.200.properties.clusters.items.properties.select_plugin
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/job/{job_id}
    + responses.200.properties.jobs.items.properties.original_sluid
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.oversubscribe
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.exclusive
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.sluid
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.steps.items.properties.submit_line
      → selected by Slurm-web but not actually used in frontend

    GET /slurmdb/v{version}/jobs/
    + responses.200.properties.jobs.items.properties.original_sluid
    + responses.200.properties.jobs.items.properties.oversubscribe
    + responses.200.properties.jobs.items.properties.exclusive
    + responses.200.properties.jobs.items.properties.sluid
    + responses.200.properties.jobs.items.properties.steps.items.properties.submit_line
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/ping/
    + responses.200.properties.pings.items.properties.status
    + responses.200.properties.pings.items.required.status
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/job/allocate
    - requestBody.properties.hetjob.items.properties.power_flags
    + requestBody.properties.hetjob.items.properties.cores_per_socket
    + requestBody.properties.hetjob.items.properties.memory_update_margin
    + requestBody.properties.hetjob.items.properties.memory_update_delay
    + requestBody.properties.hetjob.items.properties.container_type
    - requestBody.properties.job.properties.power_flags
    + requestBody.properties.job.properties.cores_per_socket
    + requestBody.properties.job.properties.memory_update_margin
    + requestBody.properties.job.properties.memory_update_delay
    + requestBody.properties.job.properties.container_type
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/job/submit
    - requestBody.properties.jobs.items.properties.power_flags
    + requestBody.properties.jobs.items.properties.cores_per_socket
    + requestBody.properties.jobs.items.properties.memory_update_margin
    + requestBody.properties.jobs.items.properties.memory_update_delay
    + requestBody.properties.jobs.items.properties.container_type
    - requestBody.properties.job.properties.power_flags
    + requestBody.properties.job.properties.cores_per_socket
    + requestBody.properties.job.properties.memory_update_margin
    + requestBody.properties.job.properties.memory_update_delay
    + requestBody.properties.job.properties.container_type
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/job/{job_id}
    - requestBody.properties.power_flags
    + requestBody.properties.cores_per_socket
    + requestBody.properties.memory_update_margin
    + requestBody.properties.memory_update_delay
    + requestBody.properties.container_type
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/jobs/requeue
    + endpoint
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/partitions/
    + endpoint
    → endpoint not used by Slurm-web

    POST /slurmdb/v{version}/clusters/
    - requestBody.properties.clusters.items.properties.select_plugin
    → endpoint not used by Slurm-web

    POST /slurmdb/v{version}/config
    - requestBody.properties.clusters.items.properties.select_plugin
    → endpoint not used by Slurm-web
    """
