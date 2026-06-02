/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { JobSortCriterion, JobSortOrder } from '@/stores/runtime/jobs'
import { countGPUFromAllocatedTRES } from '@/composables/gateway/slurm/gres'
import { compareSlurmOptionalNumber } from '@/composables/gateway/slurm/numbers'
import { extractSlurmTRESResources } from '@/composables/gateway/slurm/tres'
import type { SlurmAcctJob } from '@/composables/gateway/slurm/types'

export function compareAcctJobs(
  a: SlurmAcctJob,
  b: SlurmAcctJob,
  sort: JobSortCriterion,
  order: JobSortOrder
): number {
  if (sort == 'user') {
    if (a.user > b.user) {
      return order == 'asc' ? 1 : -1
    }
    if (a.user < b.user) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'state') {
    const aState = acctJobStates(a).join()
    const bState = acctJobStates(b).join()
    if (aState > bState) {
      return order == 'asc' ? 1 : -1
    }
    if (aState < bState) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'priority') {
    return compareSlurmOptionalNumber(a.priority, b.priority, order)
  } else if (sort == 'resources') {
    const aRes = acctJobResources(a)
    const bRes = acctJobResources(b)
    if (aRes.node > bRes.node) {
      return order == 'asc' ? 1 : -1
    }
    if (aRes.node < bRes.node) {
      return order == 'asc' ? -1 : 1
    }
    const aCpus = aRes.cpu >= 0 ? aRes.cpu : 0
    const bCpus = bRes.cpu >= 0 ? bRes.cpu : 0
    if (aCpus > bCpus) {
      return order == 'asc' ? 1 : -1
    }
    if (aCpus < bCpus) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'end') {
    const aEnd = endTimestamp(a)
    const bEnd = endTimestamp(b)
    if (aEnd === undefined && bEnd === undefined) {
      return compareAcctJobs(a, b, 'id', order)
    }
    if (aEnd === undefined) {
      return order == 'asc' ? -1 : 1
    }
    if (bEnd === undefined) {
      return order == 'asc' ? 1 : -1
    }
    if (aEnd > bEnd) {
      return order == 'asc' ? 1 : -1
    }
    if (aEnd < bEnd) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else {
    if (a.job_id > b.job_id) {
      return order == 'asc' ? 1 : -1
    }
    if (a.job_id < b.job_id) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  }
}

export function acctJobStates(job: SlurmAcctJob): string[] {
  return job.state?.current ?? []
}

function endTimestamp(job: SlurmAcctJob): number | undefined {
  const end = job.time?.end
  if (end === undefined) return undefined
  if (typeof end === 'number') return end
  if (end.set && !end.infinite) return end.number
  return undefined
}

export function formatAcctJobEndTime(job: SlurmAcctJob): string {
  const end = endTimestamp(job)
  if (end === undefined) return '-'
  return new Date(end * 1000).toLocaleString()
}

export function acctJobResources(job: SlurmAcctJob): { node: number; cpu: number; memory: number } {
  return extractSlurmTRESResources(job.tres?.allocated ?? [])
}

export function acctJobCPUs(job: SlurmAcctJob): number {
  const cpu = acctJobResources(job).cpu
  return cpu >= 0 ? cpu : 0
}

export function acctJobAllocatedGPU(job: SlurmAcctJob): number {
  return countGPUFromAllocatedTRES(job.tres.allocated)
}
