import { describe, expect, test } from 'vitest'
import { countGPUFromAllocatedTRES } from '@/composables/gateway/slurm/gres'

describe('countGPUFromAllocatedTRES', () => {
  test('no gpu gres', () => {
    expect(
      countGPUFromAllocatedTRES([
        { type: 'cpu', name: '', id: 1, count: 8 },
        { type: 'node', name: '', id: 4, count: 2 }
      ])
    ).toBe(0)
  })
  test('untyped gpu gres entry', () => {
    expect(countGPUFromAllocatedTRES([{ type: 'gres', name: 'gpu', id: 1001, count: 4 }])).toBe(4)
  })
  test('typed gpu gres entry', () => {
    expect(
      countGPUFromAllocatedTRES([{ type: 'gres', name: 'gpu:h100', id: 1002, count: 2 }])
    ).toBe(2)
  })
  test('sum of multiple typed gpu gres entries', () => {
    expect(
      countGPUFromAllocatedTRES([
        { type: 'gres', name: 'gpu:h100', id: 1002, count: 2 },
        { type: 'gres', name: 'gpu:h200', id: 1003, count: 3 }
      ])
    ).toBe(5)
  })
  test('untyped gpu takes precedence over typed entries', () => {
    expect(
      countGPUFromAllocatedTRES([
        { type: 'cpu', name: '', id: 1, count: 1 },
        { type: 'gres', name: 'gpu', id: 1001, count: 4 },
        { type: 'gres', name: 'gpu:h100', id: 1002, count: 4 }
      ])
    ).toBe(4)
  })
  test('full allocated tres with untyped and typed gpu', () => {
    expect(
      countGPUFromAllocatedTRES([
        { type: 'cpu', name: '', id: 1, count: 1 },
        { type: 'mem', name: '', id: 2, count: 512 },
        { type: 'node', name: '', id: 4, count: 1 },
        { type: 'gres', name: 'gpu', id: 1001, count: 4 },
        { type: 'gres', name: 'gpu:h100', id: 1002, count: 4 }
      ])
    ).toBe(4)
  })
})
