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
import type { SlurmJob, SlurmJobGPUFields } from '@/composables/gateway/slurm/types'

export function compareJobs(
  a: SlurmJob,
  b: SlurmJob,
  sort: JobSortCriterion,
  order: JobSortOrder
): number {
  if (sort == 'user') {
    if (a.user_name > b.user_name) {
      return order == 'asc' ? 1 : -1
    }
    if (a.user_name < b.user_name) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'state') {
    if (a.job_state > b.job_state) {
      return order == 'asc' ? 1 : -1
    }
    if (a.job_state < b.job_state) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'priority') {
    return compareSlurmOptionalNumber(a.priority, b.priority, order)
  } else if (sort == 'resources') {
    const cmp = compareSlurmOptionalNumber(a.node_count, b.node_count, order)
    if (cmp) return cmp
    return compareSlurmOptionalNumber(a.cpus, b.cpus, order)
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

export function isJobNameEmpty(name: string | undefined): boolean {
  return (name ?? '').trim() === ''
}

/** Display label for a job name in list views; empty names show ∅. */
export function jobNameLabel(name: string | undefined): string {
  return isJobNameEmpty(name) ? '∅' : (name ?? '').trim()
}

/**
 * Return whether a job name matches the filter pattern.
 * Patterns wrapped in slashes (e.g. `/^batch-/i`) are treated as JavaScript
 * regular expressions; otherwise the pattern is a case-insensitive substring.
 * Invalid regex syntax never matches.
 */
export function jobNameMatches(pattern: string, jobName: string | undefined): boolean {
  const name = jobName ?? ''
  const match = pattern.match(/^\/(.+)\/([gimsuy]*)$/)
  if (match) {
    try {
      return new RegExp(match[1], match[2]).test(name)
    } catch {
      return false
    }
  }
  return name.toLowerCase().includes(pattern.toLowerCase())
}

export function jobPriorityLabel(job: SlurmJob): string {
  if (!job.job_state.includes('PENDING')) return '-'
  if (job.priority.set) {
    if (job.priority.infinite) {
      return '∞'
    }
    return job.priority.number.toString()
  }
  return '∅'
}

/*
 * Return the number of GPUs from a GRES string, eg:
 *
 * "gpu:4" -> 4
 * "gres/gpu:tesla:2" -> 2
 * "gpu:h100:2(IDX:0-1),gpu:h200:4(IDX:2-5)" -> 6
 */
function countGPURequest(tresRequest: string): number {
  let total = 0
  for (const _tres of tresRequest.split(',')) {
    let tres = _tres.split('(')[0]
    tres = tres.replace('=', ':')
    const items = tres.split(':')
    if (!['gpu', 'gres/gpu'].includes(items[0])) continue
    if (items.length == 2) total += parseInt(items[1])
    else total += parseInt(items[2])
  }
  return total
}

export function jobAllocatedGPU(job: SlurmJobGPUFields): number {
  if (job.gres_detail && job.gres_detail.length)
    return job.gres_detail.reduce((gpu, currentGres) => gpu + countGPURequest(currentGres), 0)
  if (job.tres) {
    const fromTRES = countGPUFromAllocatedTRES(job.tres.allocated)
    if (fromTRES > 0) return fromTRES
  }
  return -1
}

export function jobRequestedGPU(job: SlurmJobGPUFields): { count: number; reliable: boolean } {
  if (job.tres_per_job && job.tres_per_job.length) {
    return { count: countGPURequest(job.tres_per_job), reliable: true }
  }
  if (job.tres_per_node && job.tres_per_node.length && job.node_count && job.node_count.set) {
    return {
      count: countGPURequest(job.tres_per_node) * job.node_count.number,
      reliable: true
    }
  }
  if (
    job.tres_per_socket &&
    job.tres_per_socket.length &&
    job.node_count &&
    job.node_count.set &&
    job.sockets_per_node &&
    job.sockets_per_node.set
  ) {
    return {
      count:
        countGPURequest(job.tres_per_socket) * job.node_count.number * job.sockets_per_node.number,
      reliable: false
    }
  }
  if (job.tres_per_task && job.tres_per_task.length && job.tasks && job.tasks.set) {
    return {
      count: countGPURequest(job.tres_per_task) * job.tasks.number,
      reliable: true
    }
  }
  return { count: 0, reliable: true }
}

export function jobResourcesGPU(job: SlurmJobGPUFields): { count: number; reliable: boolean } {
  const result = jobAllocatedGPU(job)
  if (result != -1) return { count: result, reliable: true }
  return jobRequestedGPU(job)
}
