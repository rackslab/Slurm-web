import { describe, expect, test } from 'vitest'
import {
  compareAcctJobs,
  acctJobResources,
  acctJobCPUs,
  acctJobAllocatedGPU
} from '@/composables/gateway/slurm/acctJob'

function acctJobFixture() {
  return {
    account: 'optic',
    job_id: 1,
    nodes: 'node1',
    partition: 'gpu',
    priority: { infinite: false, number: 1, set: true },
    qos: 'normal',
    state: { current: ['COMPLETED'], reason: 'None' },
    time: {},
    tres: {
      allocated: [
        { type: 'cpu', name: '', id: 1, count: 8 },
        { type: 'mem', name: '', id: 2, count: 4096 },
        { type: 'node', name: '', id: 4, count: 2 }
      ],
      requested: []
    },
    user: 'alice'
  }
}

describe('acctJobResources', () => {
  test('allocated TRES', () => {
    expect(acctJobResources(acctJobFixture())).toStrictEqual({
      node: 2,
      cpu: 8,
      memory: 4096
    })
  })
})

describe('acctJobAllocatedGPU', () => {
  test('no allocated gpu gres', () => {
    expect(acctJobAllocatedGPU(acctJobFixture())).toBe(0)
  })
  test('allocated gpu gres count', () => {
    const job = acctJobFixture()
    job.tres.allocated.push({ type: 'gres', name: 'gpu', id: 1001, count: 4 })
    expect(acctJobAllocatedGPU(job)).toBe(4)
  })
})

describe('acctJobCPUs', () => {
  test('from allocated tres', () => {
    expect(acctJobCPUs(acctJobFixture())).toBe(8)
  })
  test('missing allocated cpu returns 0', () => {
    const job = acctJobFixture()
    job.tres.allocated = []
    expect(acctJobCPUs(job)).toBe(0)
  })
})

describe('compareAcctJobs resources', () => {
  test('sort by node then cpu', () => {
    const a = acctJobFixture()
    const b = acctJobFixture()
    b.job_id = 2
    b.tres.allocated = [
      { type: 'cpu', name: '', id: 1, count: 16 },
      { type: 'node', name: '', id: 4, count: 4 }
    ]
    expect(compareAcctJobs(a, b, 'resources', 'asc')).toBe(-1)
    expect(compareAcctJobs(b, a, 'resources', 'asc')).toBe(1)
  })
})

describe('compareAcctJobs end', () => {
  test('desc puts most recent end first', () => {
    const a = acctJobFixture()
    const b = acctJobFixture()
    b.job_id = 2
    a.time = { end: 100 }
    b.time = { end: 200 }
    expect(compareAcctJobs(a, b, 'end', 'desc')).toBe(1)
    expect(compareAcctJobs(b, a, 'end', 'desc')).toBe(-1)
  })

  test('asc puts oldest end first', () => {
    const a = acctJobFixture()
    const b = acctJobFixture()
    b.job_id = 2
    a.time = { end: 100 }
    b.time = { end: 200 }
    expect(compareAcctJobs(a, b, 'end', 'asc')).toBe(-1)
    expect(compareAcctJobs(b, a, 'end', 'asc')).toBe(1)
  })

  test('missing end sorts last in desc', () => {
    const a = acctJobFixture()
    const b = acctJobFixture()
    b.job_id = 2
    b.time = { end: 200 }
    expect(compareAcctJobs(a, b, 'end', 'desc')).toBe(1)
    expect(compareAcctJobs(b, a, 'end', 'desc')).toBe(-1)
  })
})
