import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeView from '@/views/NodeView.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import { getMBHumanUnit } from '@/composables/GatewayAPI'
import type { ClusterJob, ClusterNode } from '@/composables/GatewayAPI'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import nodeAllocated from '../assets/node-allocated.json'
import jobsNode from '../assets/jobs-node.json'
import { nextTick } from 'vue'

const mockNodeDataPoller = getMockClusterDataPoller<ClusterNode>()
const mockJobsDataPoller = getMockClusterDataPoller<ClusterJob[]>()

const useClusterDataPoller = vi.hoisted(() => vi.fn())
vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller
}))

describe('NodeView.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true
      }
    ]
  })
  test('display node details', async () => {
    useClusterDataPoller.mockReturnValueOnce(mockNodeDataPoller)
    useClusterDataPoller.mockReturnValueOnce(mockJobsDataPoller)
    mockNodeDataPoller.data.value = nodeAllocated
    mockJobsDataPoller.data.value = jobsNode
    const wrapper = mount(NodeView, {
      props: {
        cluster: 'foo',
        nodeName: 'cn1'
      }
    })
    await nextTick()
    // Check some node fields
    expect(wrapper.get('dl div#status dd').getComponent(NodeMainState).props()).toStrictEqual({
      status: nodeAllocated.state
    })
    // Check list of jobs has the same number of items than the number of jobs running
    // on the node.
    expect(wrapper.get('dl div#jobs dd').findAll('li').length).toBe(jobsNode.length)
    expect(wrapper.get('dl div#cpu dd').text()).toBe(
      `${nodeAllocated.sockets} x ${nodeAllocated.cores} = ${nodeAllocated.cpus}`
    )
    expect(wrapper.get('dl div#arch dd').text()).toBe(nodeAllocated.architecture)
    expect(wrapper.get('dl div#memory dd').text()).toBe(getMBHumanUnit(nodeAllocated.real_memory))
    expect(wrapper.get('dl div#partitions dd').text()).toBe(nodeAllocated.partitions[0])
  })

  test('rounds CPU percentage correctly', async () => {
    // Force specific values for predictable testing
    const testNode = {
      ...nodeAllocated,
      alloc_cpus: 32, // 32 allocated
      cpus: 64 // 64 total = 50%
    }

    useClusterDataPoller.mockReturnValueOnce(mockNodeDataPoller)
    useClusterDataPoller.mockReturnValueOnce(mockJobsDataPoller)
    mockNodeDataPoller.data.value = testNode
    mockJobsDataPoller.data.value = jobsNode

    const wrapper = mount(NodeView, {
      props: {
        cluster: 'foo',
        nodeName: 'cn1'
      }
    })
    await nextTick()

    // CPU: 32/64 = 50%
    const cpuPercentage = wrapper.get('dl div#allocation dd ul li:first-child span').text()
    expect(cpuPercentage).toBe('(50%)')
  })

  test('rounds Memory percentage correctly', async () => {
    // Force specific values for predictable testing
    const testNode = {
      ...nodeAllocated,
      alloc_memory: 8000, // 8000 MB allocated
      real_memory: 16000 // 16000 MB total = 50%
    }

    useClusterDataPoller.mockReturnValueOnce(mockNodeDataPoller)
    useClusterDataPoller.mockReturnValueOnce(mockJobsDataPoller)
    mockNodeDataPoller.data.value = testNode
    mockJobsDataPoller.data.value = jobsNode

    const wrapper = mount(NodeView, {
      props: {
        cluster: 'foo',
        nodeName: 'cn1'
      }
    })
    await nextTick()

    // Memory: 8000/16000 = 50%
    const memoryPercentage = wrapper.get('dl div#allocation dd ul li:nth-child(2) span').text()
    expect(memoryPercentage).toBe('(50%)')
  })

  test('rounds GPU percentage correctly when available', async () => {
    // Force specific values for predictable testing
    const nodeWithGPU = {
      ...nodeAllocated,
      gres: 'gpu:4', // 4 GPUs available
      gres_used: 'gpu:2' // 2 GPUs used = 50%
    }

    useClusterDataPoller.mockReturnValueOnce(mockNodeDataPoller)
    useClusterDataPoller.mockReturnValueOnce(mockJobsDataPoller)
    mockNodeDataPoller.data.value = nodeWithGPU
    mockJobsDataPoller.data.value = jobsNode

    const wrapper = mount(NodeView, {
      props: {
        cluster: 'foo',
        nodeName: 'cn1'
      }
    })
    await nextTick()

    // GPU: 2/4 = 50%
    const gpuPercentage = wrapper.get('dl div#allocation dd ul li:nth-child(3) span').text()
    expect(gpuPercentage).toBe('(50%)')
  })

  test('rounds to 1 decimal place for non-integer percentages', async () => {
    // Force specific values for predictable testing
    const nodeWithPartialAllocation = {
      ...nodeAllocated,
      alloc_cpus: 15, // 15/64 = 23.4375% -> 23.4%
      cpus: 64,
      alloc_memory: 5000, // 5000/16000 = 31.25% -> 31.3%
      real_memory: 16000
    }

    useClusterDataPoller.mockReturnValueOnce(mockNodeDataPoller)
    useClusterDataPoller.mockReturnValueOnce(mockJobsDataPoller)
    mockNodeDataPoller.data.value = nodeWithPartialAllocation
    mockJobsDataPoller.data.value = jobsNode

    const wrapper = mount(NodeView, {
      props: {
        cluster: 'foo',
        nodeName: 'cn1'
      }
    })
    await nextTick()

    // CPU: 15/64 = 23.4375% -> 23.4%
    const cpuPercentage = wrapper.get('dl div#allocation dd ul li:first-child span').text()
    expect(cpuPercentage).toBe('(23.4%)')

    // Memory: 5000/16000 = 31.25% -> 31.3%
    const memoryPercentage = wrapper.get('dl div#allocation dd ul li:nth-child(2) span').text()
    expect(memoryPercentage).toBe('(31.3%)')
  })
})
