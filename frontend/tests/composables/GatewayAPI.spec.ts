import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'

import jobs from '../assets/jobs.json'
import jobPending from '../assets/job-pending.json'
import jobGpuArchived from '../assets/job-gpus-archived.json'
import jobGpuCompleted from '../assets/job-gpus-completed.json'
import jobGpuPending from '../assets/job-gpus-pending.json'
import jobGpuRunning from '../assets/job-gpus-running.json'
import jobGpuMultiNodes from '../assets/job-gpus-multi-nodes.json'
import jobGpuType from '../assets/job-gpus-type.json'
import jobGpuMultiTypes from '../assets/job-gpus-multi-types.json'
import jobGpuPerNode from '../assets/job-gpus-per-node.json'
import jobGpuPerSocket from '../assets/job-gpus-per-socket.json'
import jobGpuPerTask from '../assets/job-gpus-per-task.json'
import nodeDown from '../assets/node-down.json'
import nodeAllocated from '../assets/node-allocated.json'
import nodeIdle from '../assets/node-idle.json'
import nodeMixed from '../assets/node-mixed.json'
import nodeWithGpusAllocated from '../assets/node-with-gpus-allocated.json'
import nodeWithGpusIdle from '../assets/node-with-gpus-idle.json'
import nodeWithGpusMixed from '../assets/node-with-gpus-mixed.json'
import nodeWithGpusModelAllocated from '../assets/node-with-gpus-model-allocated.json'
import nodeWithGpusModelIdle from '../assets/node-with-gpus-model-idle.json'
import nodeWithGpusModelMixed from '../assets/node-with-gpus-model-mixed.json'

import nodeWithoutGpu from '../assets/node-without-gpu.json'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import {
  compareJobs,
  jobAllocatedGPU,
  jobRequestedGPU,
  jobResourcesGPU
} from '@/composables/gateway/slurm/job'
import {
  compareAcctJobs,
  acctJobResources,
  acctJobCPUs,
  acctJobAllocatedGPU
} from '@/composables/gateway/slurm/acctJob'
import { countGPUFromAllocatedTRES } from '@/composables/gateway/slurm/gres'
import { extractSlurmTRESResources } from '@/composables/gateway/slurm/tres'
import {
  nodeGPULabelsFromGRES,
  nodeGPUFromGRES,
  nodeAllocationState,
  nodeMainState
} from '@/composables/gateway/slurm/node'
import { getMBHumanUnit } from '@/composables/gateway/slurm/sizes'

// Stub REST API for infrastructureImagePng tests; we only care about parsing.
const mockRestAPI = {
  postRaw: vi.fn()
}

vi.mock('@/composables/RESTAPI', () => ({
  useRESTAPI: () => mockRestAPI
}))

// Provide minimal runtime configuration for GatewayAPI initialization.
vi.mock('@/plugins/runtimeConfiguration', () => ({
  useRuntimeConfiguration: () => ({
    api_server: 'http://localhost',
    authentication: true,
    racksdb_rows_labels: true,
    racksdb_racks_labels: true,
    version: 'test'
  })
}))

describe('infrastructureImagePng', () => {
  const originalResponse = globalThis.Response
  const coordinates = { node1: [0, 0, 10, 10] }
  const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

  beforeEach(() => {
    // The response body is not used by our fake Response, but keep a realistic
    // shape so GatewayAPI continues to call Response.formData().
    mockRestAPI.postRaw.mockResolvedValue({
      headers: { 'content-type': 'multipart/form-data; boundary=mock' },
      data: new Uint8Array([0x00])
    })

    // Build a minimal FormData-like object with the parts GatewayAPI expects.
    // This avoids undici multipart parsing in tests while still exercising
    // the extraction and JSON parsing logic.
    const image = new Blob([imageBytes], { type: 'image/png' })
    const coordinatesFile = new Blob([JSON.stringify(coordinates)], {
      type: 'application/json'
    })
    const formData = {
      get: (key: string) => {
        if (key === 'image') return image
        if (key === 'coordinates') return coordinatesFile
        return null
      }
    }

    // Fake Response.formData() to return our synthetic parts.
    globalThis.Response = class {
      constructor() {}
      async formData() {
        return formData
      }
    } as typeof Response
  })

  afterEach(() => {
    globalThis.Response = originalResponse
    vi.clearAllMocks()
  })

  test('parses image and coordinates from multipart response', async () => {
    const gateway = useGatewayAPI()
    const [image, parsedCoordinates] = await gateway.infrastructureImagePng(
      'cluster',
      'infra',
      100,
      100
    )

    expect(image).toBeInstanceOf(Blob)
    expect((image as Blob).type).toBe('image/png')
    expect(parsedCoordinates).toStrictEqual(coordinates)
  })
})

describe('compareJobs', () => {
  test('compare same jobs', () => {
    const jobA = jobs[1]
    const jobB = jobs[1]
    // A == B
    expect(compareJobs(jobA, jobB, 'id', 'asc')).toBe(0)
    expect(compareJobs(jobA, jobB, 'id', 'desc')).toBe(0)
  })
  test('compare sort by id', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobB.job_id = jobB.job_id + 1
    // A < B
    expect(compareJobs(jobA, jobB, 'id', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'id', 'desc')).toBe(1)
  })
  test('compare sort by user', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.user_name = 'john'
    jobB.user_name = 'mary'
    // A < B
    expect(compareJobs(jobA, jobB, 'user', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'user', 'desc')).toBe(1)
  })
  test('compare sort by state', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.job_state = ['RUNNING']
    jobB.job_state = ['TERMINATED']
    // A < B
    expect(compareJobs(jobA, jobB, 'state', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'state', 'desc')).toBe(1)
  })
  test('compare sort by priority number', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: false, number: 1 }
    jobB.priority = { set: true, infinite: false, number: 2 }
    // A < B
    expect(compareJobs(jobA, jobB, 'priority', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'priority', 'desc')).toBe(1)
  })
  test('compare sort by priority unset', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: false, number: 1 }
    jobB.priority = { set: false, infinite: false, number: 2 }
    // A > B
    expect(compareJobs(jobA, jobB, 'priority', 'asc')).toBe(1)
    expect(compareJobs(jobA, jobB, 'priority', 'desc')).toBe(-1)
  })
  test('compare sort by priority unset both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: false, infinite: false, number: 1 }
    jobB.priority = { set: false, infinite: false, number: 2 }
    // A == B
    expect(compareJobs(jobA, jobB, 'priority', 'asc')).toBe(0)
    expect(compareJobs(jobA, jobB, 'priority', 'desc')).toBe(0)
  })
  test('compare sort by priority infinite', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: true, number: 0 }
    jobB.priority = { set: true, infinite: false, number: 2 }
    // A > B
    expect(compareJobs(jobA, jobB, 'priority', 'asc')).toBe(1)
    expect(compareJobs(jobA, jobB, 'priority', 'desc')).toBe(-1)
  })
  test('compare sort by priority infinite both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.priority = { set: true, infinite: true, number: 0 }
    jobB.priority = { set: true, infinite: true, number: 2 }
    // A == B
    expect(compareJobs(jobA, jobB, 'priority', 'asc')).toBe(0)
    expect(compareJobs(jobA, jobB, 'priority', 'desc')).toBe(0)
  })
  test('compare sort by resources nodes number', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 2 }
    jobB.cpus = { set: true, infinite: false, number: 3 }
    // A < B (cpus ignored)
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources nodes unset', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: false, infinite: false, number: 2 }
    jobB.cpus = { set: true, infinite: false, number: 3 }
    // A > B (cpus ignored)
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources nodes unset both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: false, infinite: false, number: 2 }
    jobA.cpus = { set: true, infinite: false, number: 3 }
    jobB.node_count = { set: false, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A < B (cpus considered)
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources nodes infinite', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: true, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 2 }
    jobB.cpus = { set: true, infinite: false, number: 3 }
    // A > B (cpus ignored)
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources nodes infinite both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: true, number: 0 }
    jobA.cpus = { set: true, infinite: false, number: 3 }
    jobB.node_count = { set: true, infinite: true, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A < B (cpus considered)
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources cpus number', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 3 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A < B
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(-1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(1)
  })
  test('compare sort by resources cpus number equal', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A == B
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(0)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(0)
  })
  test('compare sort by resources cpus unset', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: false, infinite: false, number: 3 }
    // A > B
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources cpus unset both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: false, infinite: false, number: 4 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: false, infinite: false, number: 3 }
    // A == B
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(0)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(0)
  })
  test('compare sort by resources cpus infinite', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: true, number: 3 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: false, number: 4 }
    // A > B
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(1)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(-1)
  })
  test('compare sort by resources cpus infinite both', () => {
    const jobA = { ...jobs[1] }
    const jobB = { ...jobs[1] }
    jobA.node_count = { set: true, infinite: false, number: 1 }
    jobA.cpus = { set: true, infinite: true, number: 3 }
    jobB.node_count = { set: true, infinite: false, number: 1 }
    jobB.cpus = { set: true, infinite: true, number: 4 }
    // A == B
    expect(compareJobs(jobA, jobB, 'resources', 'asc')).toBe(0)
    expect(compareJobs(jobA, jobB, 'resources', 'desc')).toBe(0)
  })
})

describe('jobResourcesTRES', () => {
  test('basic TRES', () => {
    const job = jobPending
    job.tres.requested = [
      {
        count: 128,
        id: 1,
        name: '',
        type: 'cpu'
      },
      {
        count: 65536,
        id: 2,
        name: '',
        type: 'mem'
      },
      {
        count: 1,
        id: 4,
        name: '',
        type: 'node'
      },
      {
        count: 128,
        id: 5,
        name: '',
        type: 'billing'
      }
    ]
    expect(extractSlurmTRESResources(job.tres.requested)).toStrictEqual({
      node: 1,
      cpu: 128,
      memory: 65536
    })
  })
  test('empty TRES', () => {
    const job = jobPending
    job.tres.requested = []
    expect(extractSlurmTRESResources(job.tres.requested)).toStrictEqual({
      node: -1,
      cpu: -1,
      memory: -1
    })
  })
})

const acctJobFixture = () => ({
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
})

describe('acctJobResources', () => {
  test('allocated TRES', () => {
    expect(acctJobResources(acctJobFixture())).toStrictEqual({
      node: 2,
      cpu: 8,
      memory: 4096
    })
  })
})

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

describe('jobAllocatedGPU', () => {
  // test specific values
  test('empty GRES', () => {
    const job = { ...jobs[0] }
    job.gres_detail = []
    expect(jobAllocatedGPU(job)).toBe(-1)
  })
  test('simple GRES', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gpu:4']
    expect(jobAllocatedGPU(job)).toBe(4)
  })
  test('mixed GRES', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['license:1,gpu:2']
    expect(jobAllocatedGPU(job)).toBe(2)
  })
  test('GRES with prefix', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gres/gpu:4']
    expect(jobAllocatedGPU(job)).toBe(4)
  })
  test('GRES with model', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gpu:h200:8']
    expect(jobAllocatedGPU(job)).toBe(8)
  })
  test('GRES with model and prefix', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gres/gpu:h200:6']
    expect(jobAllocatedGPU(job)).toBe(6)
  })
  test('GRES with index', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gpu:2(IDX:0-1)']
    expect(jobAllocatedGPU(job)).toBe(2)
  })
  test('GRES with model and index', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gpu:h100:2(IDX:2-3)']
    expect(jobAllocatedGPU(job)).toBe(2)
  })
  test('multiple GRES with model and index', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gpu:h100:2(IDX:2-3)', 'gpu:h100:4(IDX:0-3)']
    expect(jobAllocatedGPU(job)).toBe(6)
  })
  test('allocated tres gres from slurmdbd', () => {
    const job = {
      ...jobGpuArchived,
      gres_detail: [],
      tres: {
        allocated: [{ type: 'gres', name: 'gpu', id: 1001, count: 4 }],
        requested: []
      }
    }
    expect(jobAllocatedGPU(job)).toBe(4)
  })
  // test with assets
  test('archived job', () => {
    const job = { ...jobGpuArchived }
    expect(jobAllocatedGPU(job)).toBe(4)
  })
  test('completed job', () => {
    const job = { ...jobGpuCompleted }
    expect(jobAllocatedGPU(job)).toBe(4)
  })
  test('pending job', () => {
    const job = { ...jobGpuPending }
    expect(jobAllocatedGPU(job)).toBe(-1)
  })
  test('running job', () => {
    const job = { ...jobGpuRunning }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running multi nodes', () => {
    const job = { ...jobGpuMultiNodes }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running type', () => {
    const job = { ...jobGpuType }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running multi types', () => {
    const job = { ...jobGpuMultiTypes }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running gpu per node', () => {
    const job = { ...jobGpuPerNode }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running gpu per socket', () => {
    const job = { ...jobGpuPerSocket }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running gpu per task', () => {
    const job = { ...jobGpuPerTask }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
})

describe('jobRequestedGPU', () => {
  // tests with specific values
  test('empty requested GRES', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = ''
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 0, reliable: true })
  })
  test('simple GRES requested per job', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = 'gres/gpu:2'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 2, reliable: true })
  })
  test('simple GRES requested per job with equal sign', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = 'gres/gpu=2'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 2, reliable: true })
  })
  test('multiple GRES requested per job', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = 'gres/license:1,gres/gpu:4'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 4, reliable: true })
  })
  test('multiple GRES with gpu type with equal sign', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = 'gres/gpu:h100=6'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 6, reliable: true })
  })
  test('multiple GRES with gpu type per job', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = 'gres/license:1,gres/gpu:h100:6'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 6, reliable: true })
  })
  test('multiple GRES with multiple type per job', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = 'gres/license:1,gres/gpu:h100:2,gres/gpu:h200:6'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 8, reliable: true })
  })
  test('simple GRES requested per node', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = ''
    job.tres_per_node = 'gres/gpu:2'
    job.tres_per_socket = ''
    job.tres_per_task = ''
    job.node_count.number = 4
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 8, reliable: true })
  })
  test('simple GRES requested per socket', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = ''
    job.tres_per_node = ''
    job.tres_per_socket = 'gres/gpu:2'
    job.tres_per_task = ''
    job.node_count.number = 4
    job.sockets_per_node.set = true
    job.sockets_per_node.number = 2
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 16, reliable: false })
  })
  test('simple GRES requested per task', () => {
    const job = { ...jobs[0] }
    job.tres_per_job = ''
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = 'gres/gpu:2'
    job.tasks.number = 4
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 8, reliable: true })
  })
  // tests with assets
  test('archived job', () => {
    const job = { ...jobGpuArchived }
    expect(jobRequestedGPU(job)).toStrictEqual({ count: 0, reliable: true })
  })
  test('completed job', () => {
    const job = { ...jobGpuCompleted }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('pending job', () => {
    const job = { ...jobGpuPending }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('running job', () => {
    const job = { ...jobGpuPending }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('running multi nodes', () => {
    const job = { ...jobGpuMultiNodes }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('running type', () => {
    const job = { ...jobGpuType }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('running multi types', () => {
    const job = { ...jobGpuMultiTypes }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('running GPU per node', () => {
    const job = { ...jobGpuPerNode }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
  test('running GPU per socket', () => {
    const job = { ...jobGpuPerSocket }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeFalsy()
  })
  test('running GPU per task', () => {
    const job = { ...jobGpuPerTask }
    const gpu = jobRequestedGPU(job)
    expect(gpu.count).toBeGreaterThan(0)
    expect(gpu.reliable).toBeTruthy()
  })
})

describe('jobResourcesGPU', () => {
  test('empty GRES', () => {
    const job = { ...jobs[0] }
    job.gres_detail = []
    job.tres_per_job = ''
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobResourcesGPU(job)).toStrictEqual({ count: 0, reliable: true })
  })
  test('with requested GRES', () => {
    const job = { ...jobs[0] }
    job.gres_detail = []
    job.tres_per_job = 'gres/gpu:4'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobResourcesGPU(job)).toStrictEqual({ count: 4, reliable: true })
  })
  test('with allocated GRES', () => {
    const job = { ...jobs[0] }
    job.gres_detail = ['gpu:2']
    job.tres_per_job = 'gres/gpu:4'
    job.tres_per_node = ''
    job.tres_per_socket = ''
    job.tres_per_task = ''
    expect(jobResourcesGPU(job)).toStrictEqual({ count: 2, reliable: true })
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

describe('getNodeMainState', () => {
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

describe('getNodeAllocationState', () => {
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
