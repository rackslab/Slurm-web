/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest'
import {
  chassisColors,
  coresBarAxis,
  coresBarSegments,
  coresPercentage,
  getNodeFillColor,
  getNodeStrokeColor,
  progressBarColor
} from '@/composables/resources/nodeColors'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

function node(partial: Pick<SlurmNode, 'name' | 'state' | 'alloc_cpus' | 'cpus'>): SlurmNode {
  return partial as SlurmNode
}

describe('nodeColors', () => {
  test('fills nodes by the first matching Slurm state', () => {
    expect(getNodeFillColor(['IDLE'])).toBe('#70e079')
    expect(getNodeFillColor(['MIXED'])).toBe('#ffd230')
    expect(getNodeFillColor(['ALLOCATED'])).toBe('#e17100')
    expect(getNodeFillColor(['DOWN', 'IDLE'])).toBe('#c10007')
    expect(getNodeFillColor(['DRAIN'])).toBe('#ffffff')
  })

  test('strokes drain and down states', () => {
    expect(getNodeStrokeColor(['IDLE', 'DRAIN'])).toBe('#b654d6')
    expect(getNodeStrokeColor(['DRAINING'])).toBe('#b380c4')
    expect(getNodeStrokeColor(['DOWN'])).toBe('#c10007')
    expect(getNodeStrokeColor(['IDLE'])).toBeUndefined()
  })

  test('colors core usage with the 2D progress thresholds', () => {
    expect(progressBarColor(100)).toBe('#f54900')
    expect(progressBarColor(80)).toBe('#fe9a00')
    expect(progressBarColor(30)).toBe('#ffd230')
    expect(progressBarColor(0)).toBe('#7ccf00')
    expect(coresPercentage(node({ name: 'n', state: [], alloc_cpus: 3, cpus: 10 }))).toBe(30)
    expect(coresPercentage(node({ name: 'n', state: [], alloc_cpus: 0, cpus: 0 }))).toBe(0)
  })

  test('colors a chassis by representation and grays nodes outside the selection', () => {
    const idle = node({ name: 'idle', state: ['IDLE', 'DRAIN'], alloc_cpus: 0, cpus: 8 })
    const full = node({ name: 'full', state: ['ALLOCATED'], alloc_cpus: 8, cpus: 8 })

    expect(chassisColors(undefined, 'nodes')).toEqual({ fill: '#aaaaaa' })
    expect(chassisColors(idle, 'nodes')).toEqual({ fill: '#70e079', stroke: '#b654d6' })
    expect(chassisColors(full, 'nodes')).toEqual({ fill: '#e17100' })
    expect(chassisColors(idle, 'cores')).toEqual({ fill: '#7ccf00', stroke: '#b654d6' })
    expect(chassisColors(full, 'cores')).toEqual({ fill: '#f54900' })
  })

  test('splits a cores bar from the start of the chassis', () => {
    expect(coresBarAxis(2, 0.2)).toBe('x')
    expect(coresBarAxis(0.2, 2)).toBe('y')
    expect(coresBarSegments(2, 0)).toEqual({ progress: null, track: { size: 2, center: 0 } })
    expect(coresBarSegments(2, 100)).toEqual({ progress: { size: 2, center: 0 }, track: null })
    expect(coresBarSegments(2, 50)).toEqual({
      progress: { size: 1, center: -0.5 },
      track: { size: 1, center: 0.5 }
    })
  })
})
