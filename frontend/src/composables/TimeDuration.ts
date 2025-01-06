/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import type { ClusterOptionalNumber } from '@/composables/GatewayAPI'

export function representDuration(
  start: ClusterOptionalNumber,
  end: ClusterOptionalNumber
): string {
  if (!start.set || !end.set) return '-'

  let duration = end.number - start.number

  let result = ''
  if (duration >= 3600 * 24) {
    const nb_days = Math.floor(duration / (3600 * 24))
    result += nb_days + ' day' + (nb_days > 1 ? 's' : '')
    duration -= nb_days * 3600 * 24
    if (duration) result += ' '
  }
  if (duration >= 3600) {
    const nb_hours = Math.floor(duration / 3600)
    result += nb_hours + ' hour' + (nb_hours > 1 ? 's' : '')
    duration -= nb_hours * 3600
    if (duration) result += ' '
  }
  if (duration >= 60) {
    const nb_minutes = Math.floor(duration / 60)
    result += nb_minutes + ' minute' + (nb_minutes > 1 ? 's' : '')
    duration -= nb_minutes * 60
    if (duration) result += ' '
  }
  if (duration > 0) {
    result += duration + ' second' + (duration > 1 ? 's' : '')
  }
  return result
}
