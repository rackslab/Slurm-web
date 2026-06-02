/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { JobSortOrder } from '@/stores/runtime/jobs'
import type { SlurmOptionalNumber } from '@/composables/gateway/slurm/types'

/* Compare two SlurmOptionalNumber values.
 * Return 0 if equal. On ascending order, return 1 if a is over b else -1.
 * Values are inverted in descending order. */
export function compareSlurmOptionalNumber(
  a: SlurmOptionalNumber,
  b: SlurmOptionalNumber,
  order: JobSortOrder
): number {
  if (!a.set) {
    if (b.set) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  }
  if (!b.set) {
    return order == 'asc' ? 1 : -1
  }
  if (a.infinite) {
    if (!b.infinite) {
      return order == 'asc' ? 1 : -1
    }
    return 0
  }
  if (a.number > b.number) {
    return order == 'asc' ? 1 : -1
  }
  if (a.number < b.number) {
    return order == 'asc' ? -1 : 1
  }
  return 0
}

export function renderSlurmOptionalNumber(optionalNumber: SlurmOptionalNumber): string {
  if (!optionalNumber.set) {
    return '-'
  }
  if (optionalNumber.infinite) {
    return '∞'
  }
  return optionalNumber.number.toString()
}
