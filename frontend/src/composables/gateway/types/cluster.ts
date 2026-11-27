/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { JobMetric } from '@/composables/gateway/types/metrics'

export interface ClusterSlurmdbdLimits {
  jobs_max_hours: number
}

interface ClusterPermissions {
  roles: string[]
  actions: string[]
}

export interface ClusterVersions {
  slurm: string
  api: string
}

export interface ClusterStats {
  resources: {
    nodes: number
    cores: number
    memory: number
    gpus: number
  }
  jobs: {
    running: number
    total: number
  }
}

export interface ClusterDescription {
  name: string
  racksdb: boolean
  infrastructure: string
  metrics: boolean
  job_metrics?: JobMetric[]
  cache: boolean
  slurmdbd: ClusterSlurmdbdLimits
  permissions: ClusterPermissions
  versions?: ClusterVersions
  stats?: ClusterStats
  error?: boolean
}

export interface ClusterPingResponse {
  versions: ClusterVersions
}
