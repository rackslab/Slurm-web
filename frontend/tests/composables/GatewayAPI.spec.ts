import { describe, expect, test } from 'vitest'
import {
  compareClusterJobSortOrder,
  jobResourcesTRES,
  jobAllocatedGPU,
  jobRequestedGPU,
  jobResourcesGPU,
  getMBHumanUnit,
  getNodeMainState,
  getNodeAllocationState,
  getNodeGPUFromGres,
  getNodeGPU
} from '@/composables/GatewayAPI'
import jobs from '../assets/jobs.json'
import jobPending from '../assets/job-pending.json'
import jobGpuArchived from '../assets/job-gpus-archived.json'
import jobGpuCompleted from '../assets/job-gpus-completed.json'
import jobGpuPending from '../assets/job-gpus-pending.json'
import jobGpuRunning from '../assets/job-gpus-running.json'
import jobGpuGres from '../assets/job-gpus-gres.json'
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
    expect(jobResourcesTRES(job.tres.requested)).toStrictEqual({ node: 1, cpu: 128, memory: 65536 })
  })
  test('empty TRES', () => {
    const job = jobPending
    job.tres.requested = []
    expect(jobResourcesTRES(job.tres.requested)).toStrictEqual({ node: -1, cpu: -1, memory: -1 })
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
  // test with assets
  test('archived job', () => {
    const job = { ...jobGpuArchived }
    expect(jobAllocatedGPU(job)).toBe(-1)
  })
  test('completed job', () => {
    const job = { ...jobGpuCompleted }
    expect(jobAllocatedGPU(job)).toBe(-1)
  })
  test('pending job', () => {
    const job = { ...jobGpuPending }
    expect(jobAllocatedGPU(job)).toBe(-1)
  })
  test('running job', () => {
    const job = { ...jobGpuRunning }
    expect(jobAllocatedGPU(job)).toBeGreaterThan(0)
  })
  test('running gres', () => {
    const job = { ...jobGpuGres }
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
  test('running gres', () => {
    const job = { ...jobGpuGres }
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

describe('getNodeGPUFromGres', () => {
  // test with specific values
  test('empty', () => {
    expect(getNodeGPUFromGres('')).toStrictEqual([])
  })
  test('simple', () => {
    expect(getNodeGPUFromGres('gpu:2')).toStrictEqual([{ model: 'unknown', count: 2 }])
  })
  test('with model', () => {
    expect(getNodeGPUFromGres('gpu:h100:4')).toStrictEqual([{ model: 'h100', count: 4 }])
  })
  test('with index', () => {
    expect(getNodeGPUFromGres('gpu:2(IDX:0-1)')).toStrictEqual([{ model: 'unknown', count: 2 }])
  })
  test('with model and index', () => {
    expect(getNodeGPUFromGres('gpu:h100:2(IDX:0-1)')).toStrictEqual([{ model: 'h100', count: 2 }])
  })
  test('multiple types', () => {
    expect(getNodeGPUFromGres('gpu:1,gpu:h100:2,gpu:h200:4')).toStrictEqual([
      { model: 'unknown', count: 1 },
      { model: 'h100', count: 2 },
      { model: 'h200', count: 4 }
    ])
  })
  test('multiple types with index', () => {
    expect(getNodeGPUFromGres('gpu:1(IDX:0),gpu:h100:1(IDX:1),gpu:h200:0(IDX:N/A)')).toStrictEqual([
      { model: 'unknown', count: 1 },
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
  test('node with gpu model allocated', () => {
    const node = { ...nodeWithGpusModelAllocated }
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
  test('node with gpu momdel mixed', () => {
    const node = { ...nodeWithGpusModelMixed }
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
  test('node with gpu model idle', () => {
    const node = { ...nodeWithGpusModelIdle }
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

describe('getNodeMainState', () => {
  // tests with specific values
  test('node down', () => {
    expect(getNodeMainState(['DOWN'])).toStrictEqual('down')
  })
  test('node error', () => {
    expect(getNodeMainState(['ERROR'])).toStrictEqual('error')
  })
  test('node future', () => {
    expect(getNodeMainState(['FUTURE'])).toStrictEqual('future')
  })
  test('node drain', () => {
    expect(getNodeMainState(['IDLE', 'DRAIN'])).toStrictEqual('drain')
  })
  test('node draining', () => {
    expect(getNodeMainState(['ALLOCATED', 'DRAIN'])).toStrictEqual('draining')
    expect(getNodeMainState(['MIXED', 'DRAIN'])).toStrictEqual('draining')
    expect(getNodeMainState(['IDLE', 'COMPLETING', 'DRAIN'])).toStrictEqual('draining')
  })
  test('node fail', () => {
    expect(getNodeMainState(['IDLE', 'FAIL'])).toStrictEqual('fail')
  })
  test('node failing', () => {
    expect(getNodeMainState(['ALLOCATED', 'FAIL'])).toStrictEqual('failing')
    expect(getNodeMainState(['MIXED', 'FAIL'])).toStrictEqual('failing')
    expect(getNodeMainState(['IDLE', 'COMPLETING', 'FAIL'])).toStrictEqual('failing')
  })
  test('node idle', () => {
    expect(getNodeMainState(['IDLE'])).toStrictEqual('up')
  })
  // tests with assets
  test('asset node down', () => {
    const node = { ...nodeDown }
    expect(getNodeMainState(node.state)).toStrictEqual('down')
  })
  test('asset node allocated', () => {
    const node = { ...nodeAllocated }
    expect(getNodeMainState(node.state)).toStrictEqual('up')
  })
  test('asset node mixed', () => {
    const node = { ...nodeMixed }
    expect(getNodeMainState(node.state)).toStrictEqual('up')
  })
  test('asset node idle', () => {
    const node = { ...nodeIdle }
    expect(getNodeMainState(node.state)).toStrictEqual('up')
  })
})

describe('getNodeAllocationState', () => {
  // tests with specific values
  test('node allocated', () => {
    expect(getNodeAllocationState(['ALLOCATED'])).toStrictEqual('allocated')
  })
  test('node mixed', () => {
    expect(getNodeAllocationState(['MIXED'])).toStrictEqual('mixed')
  })
  test('node down', () => {
    expect(getNodeAllocationState(['DOWN'])).toStrictEqual('unavailable')
  })
  test('node error', () => {
    expect(getNodeAllocationState(['ERROR'])).toStrictEqual('unavailable')
  })
  test('node future', () => {
    expect(getNodeAllocationState(['FUTURE'])).toStrictEqual('unavailable')
  })
  test('node planned', () => {
    expect(getNodeAllocationState(['IDLE', 'PLANNED'])).toStrictEqual('planned')
  })
  test('node idle', () => {
    expect(getNodeAllocationState(['IDLE'])).toStrictEqual('idle')
  })
  // tests with assets
  test('asset node down', () => {
    const node = { ...nodeDown }
    expect(getNodeAllocationState(node.state)).toStrictEqual('unavailable')
  })
  test('asset node allocated', () => {
    const node = { ...nodeAllocated }
    expect(getNodeAllocationState(node.state)).toStrictEqual('allocated')
  })
  test('asset node idle', () => {
    const node = { ...nodeIdle }
    expect(getNodeAllocationState(node.state)).toSatisfy((value) =>
      ['idle', 'planned'].includes(value)
    )
  })
  test('asset node mixed', () => {
    const node = { ...nodeMixed }
    expect(getNodeAllocationState(node.state)).toStrictEqual('mixed')
  })
})

describe('getNodeGPU', () => {
  // test with specific values
  test('empty', () => {
    expect(getNodeGPU('')).toStrictEqual([])
  })
  test('simple', () => {
    expect(getNodeGPU('gpu:2')).toStrictEqual(['2 x unknown'])
  })
  test('with model', () => {
    expect(getNodeGPU('gpu:h100:4')).toStrictEqual(['4 x h100'])
  })
  test('with index', () => {
    expect(getNodeGPU('gpu:2(IDX:0-1)')).toStrictEqual(['2 x unknown'])
  })
  test('with model and index', () => {
    expect(getNodeGPU('gpu:h100:2(IDX:0-1)')).toStrictEqual(['2 x h100'])
  })
  test('multiple types', () => {
    expect(getNodeGPU('gpu:1,gpu:h100:2,gpu:h200:4')).toStrictEqual([
      '1 x unknown',
      '2 x h100',
      '4 x h200'
    ])
  })
  test('multiple types with index', () => {
    expect(getNodeGPU('gpu:1(IDX:0),gpu:h100:1(IDX:1),gpu:h200:0(IDX:N/A)')).toStrictEqual([
      '1 x unknown',
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
  test('node with gpu model allocated', () => {
    const node = { ...nodeWithGpusModelAllocated }
    expect(getNodeGPU(node.gres).length).toBeGreaterThan(0)
    expect(getNodeGPU(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu mixed', () => {
    const node = { ...nodeWithGpusMixed }
    expect(getNodeGPU(node.gres).length).toBeGreaterThan(0)
    expect(getNodeGPU(node.gres_used).length).toBeGreaterThan(0)
  })
  test('node with gpu model mixed', () => {
    const node = { ...nodeWithGpusModelMixed }
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
  test('node with gpu model idle', () => {
    const node = { ...nodeWithGpusModelIdle }
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
