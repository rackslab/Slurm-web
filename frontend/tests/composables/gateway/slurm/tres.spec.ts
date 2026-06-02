import { describe, expect, test } from 'vitest'
import jobPending from '../../../assets/job-pending.json'
import { extractSlurmTRESResources } from '@/composables/gateway/slurm/tres'

describe('extractSlurmTRESResources', () => {
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
