/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmTRES } from '@/composables/gateway/slurm/types'

function isUntypedAllocatedGPUGRES(entry: SlurmTRES): boolean {
  return entry.type === 'gres' && entry.count > 0 && entry.name === 'gpu'
}

function isTypedAllocatedGPUGRES(entry: SlurmTRES): boolean {
  if (entry.type !== 'gres' || entry.count <= 0) return false
  return entry.name.startsWith('gpu:')
}

/*
 * Return the number of GPUs from allocated TRES (slurmdbd / OpenAPI tres.allocated).
 *
 * Slurm may report both an untyped "gpu" line and per-type lines (eg. "gpu:h100").
 * When the untyped entry is present, use its count only. Otherwise, sum typed entries.
 */
export function countGPUFromAllocatedTRES(tres: SlurmTRES[]): number {
  const untyped = tres.filter(isUntypedAllocatedGPUGRES)
  if (untyped.length > 0) {
    return untyped.reduce((total, entry) => total + entry.count, 0)
  }
  return tres.reduce((total, entry) => {
    if (!isTypedAllocatedGPUGRES(entry)) return total
    return total + entry.count
  }, 0)
}
