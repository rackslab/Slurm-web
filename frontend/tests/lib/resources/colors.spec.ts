import { describe, test, expect } from 'vitest'
import {
  getNodeCoresUsage,
  getNodeFillColor,
  getNodeStrokeColor,
  progressBarColor
} from '@/lib/resources/colors'

describe('resources colors', () => {
  test('stroke color of highlighted states', () => {
    expect(getNodeStrokeColor(['DOWN'])).toBe('#c10007')
    expect(getNodeStrokeColor(['IDLE', 'DRAIN'])).toBe('#b654d6')
    expect(getNodeStrokeColor(['ALLOCATED', 'DRAINING'])).toBe('#b380c4')
    expect(getNodeStrokeColor(['IDLE'])).toBeUndefined()
  })
  test('fill color of states', () => {
    expect(getNodeFillColor(['IDLE'])).toBe('#70e079')
    expect(getNodeFillColor(['MIXED'])).toBe('#ffd230')
    expect(getNodeFillColor(['ALLOCATED'])).toBe('#e17100')
    expect(getNodeFillColor(['DOWN', 'IDLE'])).toBe('#c10007')
    expect(getNodeFillColor(['FUTURE'])).toBe('#ffffff')
  })
  test('cores usage', () => {
    expect(getNodeCoresUsage({ alloc_cpus: 8, cpus: 32 })).toStrictEqual({
      allocated: 8,
      total: 32,
      percentage: 25
    })
    expect(getNodeCoresUsage({ alloc_cpus: 0, cpus: 0 }).percentage).toBe(0)
    expect(getNodeCoresUsage(undefined)).toStrictEqual({ allocated: 0, total: 0, percentage: 0 })
  })
  test('progress bar color', () => {
    expect(progressBarColor(100)).toBe('#f54900')
    expect(progressBarColor(80)).toBe('#fe9a00')
    expect(progressBarColor(30)).toBe('#ffd230')
    expect(progressBarColor(0)).toBe('#7ccf00')
  })
})
