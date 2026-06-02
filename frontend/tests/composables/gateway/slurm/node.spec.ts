import { describe, expect, test } from 'vitest'
import nodeDown from '../../../assets/node-down.json'
import nodeAllocated from '../../../assets/node-allocated.json'
import nodeIdle from '../../../assets/node-idle.json'
import nodeMixed from '../../../assets/node-mixed.json'
import nodeWithGpusAllocated from '../../../assets/node-with-gpus-allocated.json'
import nodeWithGpusIdle from '../../../assets/node-with-gpus-idle.json'
import nodeWithGpusMixed from '../../../assets/node-with-gpus-mixed.json'
import nodeWithGpusModelAllocated from '../../../assets/node-with-gpus-model-allocated.json'
import nodeWithGpusModelIdle from '../../../assets/node-with-gpus-model-idle.json'
import nodeWithGpusModelMixed from '../../../assets/node-with-gpus-model-mixed.json'
import nodeWithoutGpu from '../../../assets/node-without-gpu.json'
import {
  nodeGPULabelsFromGRES,
  nodeGPUFromGRES,
  nodeAllocationState,
  nodeMainState
} from '@/composables/gateway/slurm/node'

describe('nodeGPUFromGRES', () => {
  // test with specific values
  test('empty', () => {
    expect(nodeGPUFromGRES('')).toStrictEqual([])
  })
  test('simple', () => {
    expect(nodeGPUFromGRES('gpu:2')).toStrictEqual([{ model: 'unknown', count: 2 }])
  })
  test('with model', () => {
    expect(nodeGPUFromGRES('gpu:h100:4')).toStrictEqual([{ model: 'h100', count: 4 }])
  })
  test('with index', () => {
    expect(nodeGPUFromGRES('gpu:2(IDX:0-1)')).toStrictEqual([{ model: 'unknown', count: 2 }])
  })
  test('with model and index', () => {
    expect(nodeGPUFromGRES('gpu:h100:2(IDX:0-1)')).toStrictEqual([{ model: 'h100', count: 2 }])
  })
  test('with model and socket', () => {
    expect(nodeGPUFromGRES('gpu:h100:8(S:1,3,5,7)')).toStrictEqual([{ model: 'h100', count: 8 }])
  })
  test('multiple types', () => {
    expect(nodeGPUFromGRES('gpu:1,gpu:h100:2,gpu:h200:4')).toStrictEqual([
      { model: 'unknown', count: 1 },
      { model: 'h100', count: 2 },
      { model: 'h200', count: 4 }
    ])
  })
  test('multiple types with index', () => {
    expect(nodeGPUFromGRES('gpu:1(IDX:0),gpu:h100:1(IDX:1),gpu:h200:0(IDX:N/A)')).toStrictEqual([
      { model: 'unknown', count: 1 },
      { model: 'h100', count: 1 },
      { model: 'h200', count: 0 }
    ])
  })
  // test with assets
  test('node with gpu allocated', () => {
    const node = { ...nodeWithGpusAllocated }
    expect(
      nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
  })
  test('node with gpu model allocated', () => {
    const node = { ...nodeWithGpusModelAllocated }
    expect(
      nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
  })
  test('node with gpu mixed', () => {
    const node = { ...nodeWithGpusMixed }
    expect(
      nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
  })
  test('node with gpu momdel mixed', () => {
    const node = { ...nodeWithGpusModelMixed }
    expect(
      nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
  })
  test('node with gpu idle', () => {
    const node = { ...nodeWithGpusIdle }
    expect(
      nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)).toBe(
      0
    )
  })
  test('node with gpu model idle', () => {
    const node = { ...nodeWithGpusModelIdle }
    expect(
      nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)).toBe(
      0
    )
  })
  test('node without gpu', () => {
    const node = { ...nodeWithoutGpu }
    expect(nodeGPUFromGRES(node.gres).reduce((total, current) => total + current.count, 0)).toBe(0)
    expect(nodeGPUFromGRES(node.gres_used).reduce((total, current) => total + current.count, 0)).toBe(
      0
    )
  })
})

describe('nodeMainState', () => {
  // tests with specific values
  test('node down', () => {
    expect(nodeMainState(['DOWN'])).toStrictEqual('down')
  })
  test('node error', () => {
    expect(nodeMainState(['ERROR'])).toStrictEqual('error')
  })
  test('node future', () => {
    expect(nodeMainState(['FUTURE'])).toStrictEqual('future')
  })
  test('node drain', () => {
    expect(nodeMainState(['IDLE', 'DRAIN'])).toStrictEqual('drain')
  })
  test('node draining', () => {
    expect(nodeMainState(['ALLOCATED', 'DRAIN'])).toStrictEqual('draining')
    expect(nodeMainState(['MIXED', 'DRAIN'])).toStrictEqual('draining')
    expect(nodeMainState(['IDLE', 'COMPLETING', 'DRAIN'])).toStrictEqual('draining')
  })
  test('node fail', () => {
    expect(nodeMainState(['IDLE', 'FAIL'])).toStrictEqual('fail')
  })
  test('node failing', () => {
    expect(nodeMainState(['ALLOCATED', 'FAIL'])).toStrictEqual('failing')
    expect(nodeMainState(['MIXED', 'FAIL'])).toStrictEqual('failing')
    expect(nodeMainState(['IDLE', 'COMPLETING', 'FAIL'])).toStrictEqual('failing')
  })
  test('node idle', () => {
    expect(nodeMainState(['IDLE'])).toStrictEqual('up')
  })
  // tests with assets
  test('asset node down', () => {
    const node = { ...nodeDown }
    expect(nodeMainState(node.state)).toStrictEqual('down')
  })
  test('asset node allocated', () => {
    const node = { ...nodeAllocated }
    expect(nodeMainState(node.state)).toStrictEqual('up')
  })
  test('asset node mixed', () => {
    const node = { ...nodeMixed }
    expect(nodeMainState(node.state)).toStrictEqual('up')
  })
  test('asset node idle', () => {
    const node = { ...nodeIdle }
    expect(nodeMainState(node.state)).toStrictEqual('up')
  })
})

describe('nodeAllocationState', () => {
  // tests with specific values
  test('node allocated', () => {
    expect(nodeAllocationState(['ALLOCATED'])).toStrictEqual('allocated')
  })
  test('node mixed', () => {
    expect(nodeAllocationState(['MIXED'])).toStrictEqual('mixed')
  })
  test('node down', () => {
    expect(nodeAllocationState(['DOWN'])).toStrictEqual('unavailable')
  })
  test('node error', () => {
    expect(nodeAllocationState(['ERROR'])).toStrictEqual('unavailable')
  })
  test('node future', () => {
    expect(nodeAllocationState(['FUTURE'])).toStrictEqual('unavailable')
  })
  test('node planned', () => {
    expect(nodeAllocationState(['IDLE', 'PLANNED'])).toStrictEqual('planned')
  })
  test('node idle', () => {
    expect(nodeAllocationState(['IDLE'])).toStrictEqual('idle')
  })
  // tests with assets
  test('asset node down', () => {
    const node = { ...nodeDown }
    expect(nodeAllocationState(node.state)).toStrictEqual('unavailable')
  })
  test('asset node allocated', () => {
    const node = { ...nodeAllocated }
    expect(nodeAllocationState(node.state)).toStrictEqual('allocated')
  })
  test('asset node idle', () => {
    const node = { ...nodeIdle }
    expect(nodeAllocationState(node.state)).toSatisfy((value) =>
      ['idle', 'planned'].includes(value)
    )
  })
  test('asset node mixed', () => {
    const node = { ...nodeMixed }
    expect(nodeAllocationState(node.state)).toStrictEqual('mixed')
  })
})

describe('nodeGPULabelsFromGRES', () => {
  // test with specific values
  test('empty', () => {
    expect(nodeGPULabelsFromGRES('')).toStrictEqual([])
  })
  test('simple', () => {
    expect(nodeGPULabelsFromGRES('gpu:2')).toStrictEqual(['2 x unknown'])
  })
  test('with model', () => {
    expect(nodeGPULabelsFromGRES('gpu:h100:4')).toStrictEqual(['4 x h100'])
  })
  test('with index', () => {
    expect(nodeGPULabelsFromGRES('gpu:2(IDX:0-1)')).toStrictEqual(['2 x unknown'])
  })
  test('with model and index', () => {
    expect(nodeGPULabelsFromGRES('gpu:h100:2(IDX:0-1)')).toStrictEqual(['2 x h100'])
  })
  test('with model and multiple indexes', () => {
    expect(nodeGPULabelsFromGRES('gpu:h100:5(IDX:0-2,4-5)')).toStrictEqual(['5 x h100'])
  })
  test('multiple types', () => {
    expect(nodeGPULabelsFromGRES('gpu:1,gpu:h100:2,gpu:h200:4')).toStrictEqual([
      '1 x unknown',
      '2 x h100',
      '4 x h200'
    ])
  })
  test('multiple types with index', () => {
    expect(nodeGPULabelsFromGRES('gpu:1(IDX:0),gpu:h100:1(IDX:1),gpu:h200:0(IDX:N/A)')).toStrictEqual([
      '1 x unknown',
      '1 x h100',
      '0 x h200'
    ])
  })
  // test with assets
  test('node with gpu allocated', () => {
    const node = { ...nodeWithGpusAllocated }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBeGreaterThan(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu model allocated', () => {
    const node = { ...nodeWithGpusModelAllocated }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBeGreaterThan(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu mixed', () => {
    const node = { ...nodeWithGpusMixed }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBeGreaterThan(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu model mixed', () => {
    const node = { ...nodeWithGpusModelMixed }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBeGreaterThan(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu idle', () => {
    const node = { ...nodeWithGpusIdle }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBeGreaterThan(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBeGreaterThan(0)
    nodeGPULabelsFromGRES(node.gres_used).forEach((gpu) => {
      expect(gpu[0]).toBe('0')
    })
  })
  test('node with gpu model idle', () => {
    const node = { ...nodeWithGpusModelIdle }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBeGreaterThan(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBeGreaterThan(0)
    nodeGPULabelsFromGRES(node.gres_used).forEach((gpu) => {
      expect(gpu[0]).toBe('0')
    })
  })
  test('node without gpu', () => {
    const node = { ...nodeWithoutGpu }
    expect(nodeGPULabelsFromGRES(node.gres).length).toBe(0)
    expect(nodeGPULabelsFromGRES(node.gres_used).length).toBe(0)
  })
})
