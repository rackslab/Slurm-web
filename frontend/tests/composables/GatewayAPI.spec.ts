import { describe, expect, test } from 'vitest'
import {
  compareClusterJobSortOrder,
  getMBHumanUnit,
  getNodeGPUFromGres,
  getNodeGPU
} from '@/composables/GatewayAPI'
import jobs from '../assets/jobs.json'
import nodeWithGpusAllocated from '../assets/node-with-gpus-allocated.json'
import nodeWithGpusIdle from '../assets/node-with-gpus-idle.json'
import nodeWithGpusMixed from '../assets/node-with-gpus-mixed.json'
import nodeWithoutGpu from '../assets/node-without-gpu.json'

describe('compareClusterJobSorter', () => {
  test('compare same jobs', () => {
    const jobA = jobs[1]
    const jobB = jobs[1]
    // A == B
    expect(compareClusterJobSortOrder(jobA, jobB, 'id', 'asc')).toBe(0)
    expect(compareClusterJobSortOrder(jobA, jobB, 'id', 'desc')).toBe(0)
  })
  test('compare sort by id', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobB.job_id = jobB.job_id + 1
    // A < B
    expect(compareClusterJobSortOrder(jobA, jobB, 'id', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'id', 'desc')).toBe(1)
  })
  test('compare sort by user', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.user_name = 'john'
    jobB.user_name = 'mary'
    // A < B
    expect(compareClusterJobSortOrder(jobA, jobB, 'user', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'user', 'desc')).toBe(1)
  })
  test('compare sort by state', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.job_state = ['RUNNING']
    jobB.job_state = ['TERMINATED']
    // A < B
    expect(compareClusterJobSortOrder(jobA, jobB, 'state', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'state', 'desc')).toBe(1)
  })
  test('compare sort by priority number', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: false, number: 1 }
    jobB.priority = { set: true, infinite: false, number: 2 }
    // A < B
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'desc')).toBe(1)
  })
  test('compare sort by priority unset', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: false, number: 1 }
    jobB.priority = { set: false, infinite: false, number: 2 }
    // A > B
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'asc')).toBe(1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'desc')).toBe(-1)
  })
  test('compare sort by priority unset both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: false, infinite: false, number: 1 }
    jobB.priority = { set: false, infinite: false, number: 2 }
    // A == B
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'asc')).toBe(0)
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'desc')).toBe(0)
  })
  test('compare sort by priority infinite', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: true, number: 0 }
    jobB.priority = { set: true, infinite: false, number: 2 }
    // A > B
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'asc')).toBe(1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'desc')).toBe(-1)
  })
  test('compare sort by priority infinite both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: true, number: 0 }
    jobB.priority = { set: true, infinite: true, number: 2 }
    // A == B
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'asc')).toBe(0)
    expect(compareClusterJobSortOrder(jobA, jobB, 'priority', 'desc')).toBe(0)
  })
  test('compare sort by resources nodes number', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 2 }
    jobB.cpus = { set: true, infinite: false, number: 3 }
    // A < B (cpus ignored)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources nodes unset', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: false, infinite: false, number: 2 }
    jobB.cpus = { set: true, infinite: false, number: 3 }
    // A > B (cpus ignored)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources nodes unset both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: false, infinite: false, number: 2 }
    jobA.cpus = { set: true, infinite: false, number: 3 }
    jobB.node_count = { set: false, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A < B (cpus considered)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources nodes infinite', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: true, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 2 }
    jobB.cpus = { set: true, infinite: false, number: 3 }
    // A > B (cpus ignored)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources nodes infinite both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: true, number: 0 }
    jobA.cpus = { set: true, infinite: false, number: 3 }
    jobB.node_count = { set: true, infinite: true, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A < B (cpus considered)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources cpus number', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 3 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A < B
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources cpus number equal', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A == B
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(0)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(0)
  })
  test('compare sort by resources cpus unset', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: false, infinite: false, number: 3 }
    // A > B
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources cpus unset both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: false, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: false, infinite: false, number: 3 }
    // A == B
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(0)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(0)
  })
  test('compare sort by resources cpus infinite', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: true, number: 3 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A > B
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources cpus infinite both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: true, number: 3 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: true, number: 4 }
    // A == B
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'asc')).toBe(0)
    expect(compareClusterJobSortOrder(jobA, jobB, 'resources', 'desc')).toBe(0)
  })
})

describe('getMBHumanUnit', () => {
  test('MB', () => {
    expect(getMBHumanUnit(128)).toStrictEqual('128MB')
  })
  test('MB rounded', () => {
    expect(getMBHumanUnit(128.5)).toStrictEqual('128.5MB')
    expect(getMBHumanUnit(128.32)).toStrictEqual('128.32MB')
    expect(getMBHumanUnit(128.128)).toStrictEqual('128.13MB')
  })
  test('GB', () => {
    expect(getMBHumanUnit(64 * 1024)).toStrictEqual('64GB')
  })
  test('GB rounded', () => {
    expect(getMBHumanUnit(64.4 * 1024)).toStrictEqual('64.4GB')
    expect(getMBHumanUnit(64.46 * 1024)).toStrictEqual('64.46GB')
    expect(getMBHumanUnit(64.462 * 1024)).toStrictEqual('64.46GB')
  })
  test('TB', () => {
    expect(getMBHumanUnit(4 * 1024 ** 2)).toStrictEqual('4TB')
  })
  test('TB rounded', () => {
    expect(getMBHumanUnit(4.3004 * 1024 ** 2)).toStrictEqual('4.3TB')
    expect(getMBHumanUnit(4.01 * 1024 ** 2)).toStrictEqual('4.01TB')
    expect(getMBHumanUnit(4.016 * 1024 ** 2)).toStrictEqual('4.02TB')
  })
})

describe('getNodeGPUFromGres', () => {
  // test with specific values
  test('empty', () => {
    expect(getNodeGPUFromGres('')).toStrictEqual([])
  })
  test('simple', () => {
    expect(getNodeGPUFromGres('gpu:h100:4')).toStrictEqual([{ model: 'h100', count: 4 }])
  })
  test('with index', () => {
    expect(getNodeGPUFromGres('gpu:h100:2(IDX:0-1)')).toStrictEqual([{ model: 'h100', count: 2 }])
  })
  test('multiple types', () => {
    expect(getNodeGPUFromGres('gpu:h100:2,gpu:h200:4')).toStrictEqual([
      { model: 'h100', count: 2 },
      { model: 'h200', count: 4 }
    ])
  })
  test('multiple types with index', () => {
    expect(getNodeGPUFromGres('gpu:h100:1(IDX:0),gpu:h200:0(IDX:N/A)')).toStrictEqual([
      { model: 'h100', count: 1 },
      { model: 'h200', count: 0 }
    ])
  })
  // test with assets
  test('node with gpu allocated', () => {
    const node = { ...nodeWithGpusAllocated }
    expect(
      getNodeGPUFromGres(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      getNodeGPUFromGres(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
  })
  test('node with gpu mixed', () => {
    const node = { ...nodeWithGpusMixed }
    expect(
      getNodeGPUFromGres(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      getNodeGPUFromGres(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
  })
  test('node with gpu idle', () => {
    const node = { ...nodeWithGpusIdle }
    expect(
      getNodeGPUFromGres(node.gres).reduce((total, current) => total + current.count, 0)
    ).toBeGreaterThan(0)
    expect(
      getNodeGPUFromGres(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBe(0)
  })
  test('node without gpu', () => {
    const node = { ...nodeWithoutGpu }
    expect(getNodeGPUFromGres(node.gres).reduce((total, current) => total + current.count, 0)).toBe(
      0
    )
    expect(
      getNodeGPUFromGres(node.gres_used).reduce((total, current) => total + current.count, 0)
    ).toBe(0)
  })
})

describe('getNodeGPU', () => {
  // test with specific values
  test('empty', () => {
    expect(getNodeGPU('')).toStrictEqual([])
  })
  test('simple', () => {
    expect(getNodeGPU('gpu:h100:4')).toStrictEqual(['4 x h100'])
  })
  test('with index', () => {
    expect(getNodeGPU('gpu:h100:2(IDX:0-1)')).toStrictEqual(['2 x h100'])
  })
  test('multiple types', () => {
    expect(getNodeGPU('gpu:h100:2,gpu:h200:4')).toStrictEqual(['2 x h100', '4 x h200'])
  })
  test('multiple types with index', () => {
    expect(getNodeGPU('gpu:h100:1(IDX:0),gpu:h200:0(IDX:N/A)')).toStrictEqual([
      '1 x h100',
      '0 x h200'
    ])
  })
  // test with assets
  test('node with gpu allocated', () => {
    const node = { ...nodeWithGpusAllocated }
    expect(getNodeGPU(node.gres).length).toBeGreaterThan(0)
    expect(getNodeGPU(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu mixed', () => {
    const node = { ...nodeWithGpusMixed }
    expect(getNodeGPU(node.gres).length).toBeGreaterThan(0)
    expect(getNodeGPU(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu idle', () => {
    const node = { ...nodeWithGpusIdle }
    expect(getNodeGPU(node.gres).length).toBeGreaterThan(0)
    expect(getNodeGPU(node.gres_used).length).toBeGreaterThan(0)
    getNodeGPU(node.gres_used).forEach((gpu) => {
      expect(gpu[0]).toBe('0')
    })
  })
  test('node without gpu', () => {
    const node = { ...nodeWithoutGpu }
    expect(getNodeGPU(node.gres).length).toBe(0)
    expect(getNodeGPU(node.gres_used).length).toBe(0)
  })
})
