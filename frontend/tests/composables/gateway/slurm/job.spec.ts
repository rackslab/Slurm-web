import { describe, expect, test } from 'vitest'
import jobs from '../../../assets/jobs.json'
import jobGpuArchived from '../../../assets/job-gpus-archived.json'
import jobGpuCompleted from '../../../assets/job-gpus-completed.json'
import jobGpuPending from '../../../assets/job-gpus-pending.json'
import jobGpuRunning from '../../../assets/job-gpus-running.json'
import jobGpuMultiNodes from '../../../assets/job-gpus-multi-nodes.json'
import jobGpuType from '../../../assets/job-gpus-type.json'
import jobGpuMultiTypes from '../../../assets/job-gpus-multi-types.json'
import jobGpuPerNode from '../../../assets/job-gpus-per-node.json'
import jobGpuPerSocket from '../../../assets/job-gpus-per-socket.json'
import jobGpuPerTask from '../../../assets/job-gpus-per-task.json'
import {
  compareJobs,
  jobNameLabel,
  isJobNameEmpty,
  jobAllocatedGPU,
  jobRequestedGPU,
  jobResourcesGPU,
  jobNameMatches
} from '@/composables/gateway/slurm/job'

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

describe('jobNameLabel', () => {
  test('returns ∅ for empty or whitespace-only names', () => {
    expect(jobNameLabel('')).toBe('∅')
    expect(jobNameLabel('   ')).toBe('∅')
    expect(jobNameLabel(undefined)).toBe('∅')
    expect(isJobNameEmpty('')).toBe(true)
  })

  test('returns trimmed name when set', () => {
    expect(jobNameLabel('  simulation  ')).toBe('simulation')
    expect(isJobNameEmpty('simulation')).toBe(false)
  })
})

describe('jobNameMatches', () => {
  test('matches substring case-insensitively', () => {
    expect(jobNameMatches('sim', 'MySimulation')).toBe(true)
    expect(jobNameMatches('SIM', 'mysimulation')).toBe(true)
    expect(jobNameMatches('other', 'MySimulation')).toBe(false)
  })

  test('matches regex when wrapped in slashes', () => {
    expect(jobNameMatches('/^batch$/', 'batch')).toBe(true)
    expect(jobNameMatches('/^batch$/', 'batch-extra')).toBe(false)
    expect(jobNameMatches('/bench/i', 'MyBench')).toBe(true)
  })

  test('returns false for invalid regex', () => {
    expect(jobNameMatches('/[/', 'anything')).toBe(false)
  })

  test('handles empty job name', () => {
    expect(jobNameMatches('foo', '')).toBe(false)
    expect(jobNameMatches('', '')).toBe(true)
    expect(jobNameMatches('/^$/', '')).toBe(true)
  })

  test('handles undefined job name as empty', () => {
    expect(jobNameMatches('foo', undefined)).toBe(false)
  })
})
