# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging
from .base import BaseAdapter


logger = logging.getLogger(__name__)


class AdapterV0_0_45(BaseAdapter):
    """Adapter from API version 0.0.45 to 0.0.46.

    Differences spotted between v0.0.45 and v0.0.46 API but ignored:

    GET /slurm/v{version}/conf
    + responses.200.properties.slurm_conf.properties.SerializerPlugins
    + responses.200.properties.slurm_conf.properties.RelayIOPlugin
    + responses.200.properties.slurm_conf.properties.LogTimeFormatOptions
    + responses.200.properties.slurm_conf.properties.RelayIOParameters
    + responses.200.properties.slurm_conf.properties.DefRuntimePlugin
    + responses.200.properties.slurm_conf.properties.SlurmrestdParameters
    + responses.200.properties.slurm_conf.properties.SerializerParameters
    + responses.200.properties.slurm_conf.properties.SlurmrestdHttpAuthParameters
    + responses.200.properties.slurm_conf.properties.SlurmstepdParameters
    + responses.200.properties.slurm_conf.properties.BufferAllocBytes
    + responses.200.properties.slurm_conf.properties.BufferAllocType
    ~ responses.200.properties.slurm_conf.properties.ResumeTimeout.type
      (integer → object)
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/default/topology
    + endpoint
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/diag/
    + responses.200.properties.statistics.properties.bf_exit.properties.node_unavail
    + responses.200.properties.statistics.properties.bf_exit.properties.config_changed
    + responses.200.properties.statistics.properties.bf_exit.properties.part_changed
    + responses.200.properties.statistics.properties.bf_exit.properties.node_changed
    + responses.200.properties.statistics.properties.bf_exit.properties.job_changed
    + responses.200.properties.statistics.properties.bf_exit.properties.resv_changed
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/job/{job_id}
    - responses.200.properties.jobs.items.properties.container_type
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.kv
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.slurm_rc
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.max_pids
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.relay_io
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.runtime
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.layout
      → not used by Slurm-web

    GET /slurm/v{version}/jobs/
    - responses.200.properties.jobs.items.properties.container_type
    + responses.200.properties.jobs.items.properties.kv
    + responses.200.properties.jobs.items.properties.slurm_rc
    + responses.200.properties.jobs.items.properties.max_pids
    + responses.200.properties.jobs.items.properties.relay_io
    + responses.200.properties.jobs.items.properties.runtime
    + responses.200.properties.jobs.items.properties.layout
    → not used by Slurm-web

    GET /slurm/v{version}/jobs/state/
    - responses.200.properties.jobs.items.properties.container_type
    + responses.200.properties.jobs.items.properties.kv
    + responses.200.properties.jobs.items.properties.slurm_rc
    + responses.200.properties.jobs.items.properties.max_pids
    + responses.200.properties.jobs.items.properties.relay_io
    + responses.200.properties.jobs.items.properties.runtime
    + responses.200.properties.jobs.items.properties.layout
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/licenses/
    + responses.200.properties.licenses.items.properties.ConfTotal
    + responses.200.properties.licenses.items.properties.DisableLayer
    + responses.200.properties.licenses.items.properties.DisableHRES
    + responses.200.properties.licenses.items.properties.BaseUsage
    + responses.200.properties.licenses.items.properties.Base
    + responses.200.properties.licenses.items.properties.ParentName
    + responses.200.properties.licenses.items.properties.LayerName
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/node/{node_name}
    - responses.200.properties.nodes.items.properties.gres_drained
      → not used by Slurm-web
    + responses.200.properties.nodes.items.properties.drained_tres
      → not used by Slurm-web
    + responses.200.properties.nodes.items.properties.max_drained_tres
      → not used by Slurm-web
    + responses.200.properties.nodes.items.properties.kv
      → not used by Slurm-web
    + responses.200.properties.nodes.items.properties.gres_chunks
      → not used by Slurm-web

    GET /slurm/v{version}/nodes/
    - responses.200.properties.nodes.items.properties.gres_drained
    + responses.200.properties.nodes.items.properties.drained_tres
    + responses.200.properties.nodes.items.properties.max_drained_tres
    + responses.200.properties.nodes.items.properties.kv
    + responses.200.properties.nodes.items.properties.gres_chunks
    → not used by Slurm-web

    GET /slurm/v{version}/partition/{partition_name}
    + responses.200.properties.partitions.items.properties.kv
    - responses.200.properties.partitions.items.properties.maximums.properties.shares
    - responses.200.properties.partitions.items.properties.maximums.properties
      .oversubscribe
    - responses.200.properties.partitions.items.properties.maximums.properties
      .memory_per_cpu
    - responses.200.properties.partitions.items.properties.defaults.properties
      .memory_per_cpu
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/partitions/
    + responses.200.properties.partitions.items.properties.kv
    - responses.200.properties.partitions.items.properties.maximums.properties.shares
    - responses.200.properties.partitions.items.properties.maximums.properties
      .oversubscribe
    - responses.200.properties.partitions.items.properties.maximums.properties
      .memory_per_cpu
    - responses.200.properties.partitions.items.properties.defaults.properties
      .memory_per_cpu
    → not used by Slurm-web

    GET /slurm/v{version}/reservation/{reservation_name}
    + responses.200.properties.reservations.items.properties.kv
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/reservations/
    + responses.200.properties.reservations.items.properties.kv
      → not used by Slurm-web

    GET /slurm/v{version}/shares
    + responses.200.properties.shares.properties.shares.items.properties.shares
      .properties.parent
    → endpoint not used by Slurm-web

    GET /slurm/v{version}/topology/{topology_name}
    + endpoint
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/association/
    + responses.200.properties.associations.items.properties.tres
    ~ responses.200.properties.associations.items.properties.shares_raw.type
      (integer → object)
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/associations/
    + responses.200.properties.associations.items.properties.tres
      → not used by Slurm-web
    ~ responses.200.properties.associations.items.properties.shares_raw.type
      (integer → object)
      → not used by Slurm-web

    GET /slurmdb/v{version}/conf
    + responses.200.properties.slurmdbd_conf.properties.SerializerPlugins
    + responses.200.properties.slurmdbd_conf.properties.HttpAuthParameters
    + responses.200.properties.slurmdbd_conf.properties.SerializerParameters
    + responses.200.properties.slurmdbd_conf.properties.DebugFlags
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/config
    + responses.200.properties.qos.items.properties.limits.properties.tres
    + responses.200.properties.associations.items.properties.tres
    ~ responses.200.properties.associations.items.properties.shares_raw.type
      (integer → object)
    → endpoint not used by Slurm-web

    GET /slurmdb/v{version}/job/{job_id}
    + responses.200.properties.jobs.items.properties.layout
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.slurm_rc
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.kv
      → not used by Slurm-web
    + responses.200.properties.jobs.items.properties.billing_raw
      → not used by Slurm-web
    + parameters.show_job_environment, skip_steps, show_kv,
      disable_truncate_usage_time, usage_time_as_submit_time, show_batch_script,
      whole_hetjob, disable_wait_for_result, show_duplicates, disable_whole_hetjob
      → not used by Slurm-web

    GET /slurmdb/v{version}/jobs/
    + responses.200.properties.jobs.items.properties.layout
    + responses.200.properties.jobs.items.properties.slurm_rc
    + responses.200.properties.jobs.items.properties.kv
    + responses.200.properties.jobs.items.properties.billing_raw
    + parameters.show_kv
    → not used by Slurm-web

    GET /slurmdb/v{version}/qos/
    + responses.200.properties.qos.items.properties.limits.properties.tres
      → not used by Slurm-web

    GET /slurmdb/v{version}/qos/{qos}
    + responses.200.properties.qos.items.properties.limits.properties.tres
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/hres/
    + endpoint
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/job/allocate
    POST /slurm/v{version}/job/submit
    POST /slurm/v{version}/job/{job_id}
    - requestBody.[…].container_type
    + requestBody.[…].max_pids
    + requestBody.[…].relay_io
    + requestBody.[…].user
    + requestBody.[…].runtime
    + requestBody.[…].layout
    → endpoints not used by Slurm-web

    POST /slurm/v{version}/node/{node_name}
    POST /slurm/v{version}/nodes/
    - requestBody.properties.reason_uid
    + requestBody.properties.suspend_time
    → endpoints not used by Slurm-web

    POST /slurm/v{version}/partitions/
    + requestBody.properties.partitions.items.properties.kv
    - requestBody.properties.partitions.items.properties.maximums.properties.shares
    - requestBody.properties.partitions.items.properties.maximums.properties
      .oversubscribe
    - requestBody.properties.partitions.items.properties.maximums.properties
      .memory_per_cpu
    - requestBody.properties.partitions.items.properties.defaults.properties
      .memory_per_cpu
    → endpoint not used by Slurm-web

    POST /slurm/v{version}/tres/
    + endpoint
    → endpoint not used by Slurm-web

    POST /slurmdb/v{version}/accounts_association/
    POST /slurmdb/v{version}/users_association/
    + requestBody.[…].association.properties.tresdecayhalflife
    ~ requestBody.[…].association.properties.fairshare.type (integer → object)
    → endpoints not used by Slurm-web

    POST /slurmdb/v{version}/associations/
    POST /slurmdb/v{version}/config
    + requestBody.properties.associations.items.properties.tres
    ~ requestBody.properties.associations.items.properties.shares_raw.type
      (integer → object)
    + requestBody.properties.qos.items.properties.limits.properties.tres (config)
    → endpoints not used by Slurm-web

    POST /slurmdb/v{version}/job/{job_id}
    POST /slurmdb/v{version}/jobs/
    + requestBody.[…].kv
    → endpoints not used by Slurm-web

    POST /slurmdb/v{version}/qos/
    + requestBody.properties.qos.items.properties.limits.properties.tres
    → endpoint not used by Slurm-web
    """
