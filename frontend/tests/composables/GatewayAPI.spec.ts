import { describe, expect, test } from 'vitest'
import { compareClusterJobSortOrder } from '@/composables/GatewayAPI'
import jobs from '../assets/jobs.json'

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
