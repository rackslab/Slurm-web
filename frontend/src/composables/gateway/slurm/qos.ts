/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

export function renderQosLabel(list?: string[]): string {
  if (!list || list.length === 0) {
    return '∅'
  }
  return list.join(', ')
}

export function renderQosFlag(flag: string): string {
  switch (flag) {
    case 'OVERRIDE_PARTITION_QOS':
      return 'OverPartQos'
    default:
      return flag
  }
}
