/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

/*
 * Colors of nodes in resources diagrams, shared by 2D and 3D representations.
 */

import type { SlurmNode } from '@/composables/gateway/slurm/types'

/* Color of nodes not selected by filters */
export const FILTERED_NODE_COLOR = '#aaaaaa'
/* Color of ring around hovered nodes */
export const HOVER_COLOR = '#74a5d6'
/* Background color of cores allocation progress bars */
export const CORES_BAR_BACKGROUND_COLOR = '#e5e7eb' // gray-200

const strokeColors: Record<string, string> = {
  DOWN: '#c10007',
  DRAINING: '#b380c4',
  DRAIN: '#b654d6'
}

const fillColors: Record<string, string> = {
  DOWN: '#c10007',
  IDLE: '#70e079',
  MIXED: '#ffd230',
  ALLOCATED: '#e17100'
}

/* Return the color of the stroke highlighting nodes with the given states, or
 * undefined if these states are not highlighted. */
export function getNodeStrokeColor(states: string[]): string | undefined {
  for (const [status, color] of Object.entries(strokeColors)) {
    if (states.includes(status)) {
      return color
    }
  }
  return undefined
}

/* Return the fill color of nodes with the given states. */
export function getNodeFillColor(states: string[]): string {
  for (const [status, color] of Object.entries(fillColors)) {
    if (states.includes(status)) {
      return color
    }
  }
  return '#ffffff'
}

export interface NodeCoresUsage {
  allocated: number
  total: number
  percentage: number
}

/* Return the number of allocated cores, the total number of cores and the
 * percentage of allocated cores of the given node. */
export function getNodeCoresUsage(
  node: Pick<SlurmNode, 'alloc_cpus' | 'cpus'> | undefined
): NodeCoresUsage {
  if (!node) return { allocated: 0, total: 0, percentage: 0 }
  const allocated = node.alloc_cpus || 0
  const total = node.cpus || 0
  const percentage = total > 0 ? (allocated / total) * 100 : 0
  return { allocated, total, percentage }
}

/* Return the color of cores allocation progress bars for the given percentage
 * of allocated cores. */
export function progressBarColor(percentage: number): string {
  if (percentage == 100) return '#f54900'
  else if (percentage >= 80) return '#fe9a00'
  else if (percentage >= 30) return '#ffd230'
  else return '#7ccf00'
}
