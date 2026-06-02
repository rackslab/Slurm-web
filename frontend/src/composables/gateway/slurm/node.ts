/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type {
  SlurmNodeAllocatedState,
  SlurmNodeGPU,
  SlurmNodeMainState
} from '@/composables/gateway/slurm/types'

const gresMatcher = new RegExp(',(?![^()]*\\))')
const gpumatcher = new RegExp('^gpu(?::([^:]*))?(?::([^:]*))$')

export function nodeMainState(status: string[]): SlurmNodeMainState {
  if (status.includes('DOWN')) {
    return 'down'
  } else if (status.includes('ERROR')) {
    return 'error'
  } else if (status.includes('FUTURE')) {
    return 'future'
  } else if (status.includes('DRAIN')) {
    if (status.includes('ALLOCATED') || status.includes('MIXED') || status.includes('COMPLETING'))
      return 'draining'
    else return 'drain'
  } else if (status.includes('FAIL')) {
    if (status.includes('ALLOCATED') || status.includes('MIXED') || status.includes('COMPLETING'))
      return 'failing'
    else return 'fail'
  } else {
    return 'up'
  }
}

export function nodeAllocationState(status: string[]): SlurmNodeAllocatedState {
  if (status.includes('ALLOCATED')) {
    return 'allocated'
  } else if (status.includes('MIXED')) {
    return 'mixed'
  } else if (status.includes('DOWN') || status.includes('ERROR') || status.includes('FUTURE')) {
    return 'unavailable'
  } else if (status.includes('PLANNED')) {
    return 'planned'
  } else {
    return 'idle'
  }
}

export function nodeGPUFromGRES(fullGres: string): SlurmNodeGPU[] {
  if (!fullGres.length) return []
  const results: SlurmNodeGPU[] = []
  fullGres.split(gresMatcher).forEach((gres) => {
    const matched = gpumatcher.exec(gres.replace(/\([^)]*\)$/g, ''))
    if (matched === null) return
    const [, model, end] = matched
    let count = -1
    if (end.includes('(')) count = parseInt(end.split('(')[0])
    else count = parseInt(end)
    results.push({ model: model || 'unknown', count: count })
  })
  return results
}

export function nodeGPULabelsFromGRES(fullGres: string): string[] {
  const results: string[] = []
  nodeGPUFromGRES(fullGres).forEach((gpu) => {
    results.push(`${gpu.count} x ${gpu.model}`)
  })
  return results
}
