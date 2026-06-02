/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber } from '@/composables/gateway/slurm/types'

export function renderSlurmDurationMinutes(value: SlurmOptionalNumber): string {
  if (!value.set) {
    return '-'
  }
  if (value.infinite) {
    return '∞'
  }
  let minutes = value.number
  let result = ''
  if (minutes > 60 * 24) {
    const nb_days = Math.floor(minutes / (60 * 24))
    result += nb_days.toString() + ' days '
    minutes -= nb_days * (60 * 24)
  }
  if (minutes > 60) {
    const nb_hours = Math.floor(minutes / 60)
    result += nb_hours.toString() + ' hours '
    minutes -= nb_hours * 60
  }
  if (minutes > 0) {
    result += minutes.toString() + ' mins'
  }
  return result
}
