/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmNode } from '@/composables/gateway/slurm/types'
import type { ResourcesRepresentation } from '@/stores/runtime/resources'

export const FILTERED_NODE_COLOR = '#aaaaaa'
export const CORES_BAR_TRACK_COLOR = '#e5e7eb'

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

export function getNodeStrokeColor(states: string[]): string | undefined {
  for (const [status, color] of Object.entries(strokeColors)) {
    if (states.includes(status)) {
      return color
    }
  }
  return undefined
}

export function getNodeFillColor(states: string[]): string {
  for (const [status, color] of Object.entries(fillColors)) {
    if (states.includes(status)) {
      return color
    }
  }
  return '#ffffff'
}

export function progressBarColor(percentage: number): string {
  if (percentage == 100) return '#f54900'
  else if (percentage >= 80) return '#fe9a00'
  else if (percentage >= 30) return '#ffd230'
  else return '#7ccf00'
}

export function coresPercentage(node: Pick<SlurmNode, 'alloc_cpus' | 'cpus'>): number {
  const allocated = node.alloc_cpus || 0
  const total = node.cpus || 0
  return total > 0 ? (allocated / total) * 100 : 0
}

export function chassisColors(
  node: SlurmNode | undefined,
  mode: ResourcesRepresentation
): { fill: string; stroke?: string } {
  if (!node) {
    return { fill: FILTERED_NODE_COLOR }
  }
  const stroke = getNodeStrokeColor(node.state)
  const fill =
    mode === 'cores' ? progressBarColor(coresPercentage(node)) : getNodeFillColor(node.state)
  return stroke ? { fill, stroke } : { fill }
}

export type CoresBarAxis = 'x' | 'y'

export type CoresBarSegment = {
  size: number
  center: number
}

export function coresBarAxis(width: number, height: number): CoresBarAxis {
  return width > height ? 'x' : 'y'
}

export function coresBarSegments(
  size: number,
  percentage: number
): { progress: CoresBarSegment | null; track: CoresBarSegment | null } {
  const ratio = Math.min(1, Math.max(0, percentage / 100))
  if (ratio <= 0) {
    return { progress: null, track: { size, center: 0 } }
  }
  if (ratio >= 1) {
    return { progress: { size, center: 0 }, track: null }
  }
  const progressSize = size * ratio
  const trackSize = size - progressSize
  const origin = -size / 2
  return {
    progress: { size: progressSize, center: origin + progressSize / 2 },
    track: { size: trackSize, center: origin + progressSize + trackSize / 2 }
  }
}
