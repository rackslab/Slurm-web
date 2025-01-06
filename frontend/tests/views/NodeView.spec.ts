import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeView from '@/views/NodeView.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
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
        metrics: true
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
      node: nodeAllocated
    })
    // Check list of jobs has the same number of items than the number of jobs running
    // on the node.
    expect(wrapper.get('dl div#jobs dd').findAll('li').length).toBe(jobsNode.length)
    expect(wrapper.get('dl div#cpu dd').text()).toBe(
      `${nodeAllocated.sockets} x ${nodeAllocated.cores} = ${nodeAllocated.cpus}`
    )
    expect(wrapper.get('dl div#arch dd').text()).toBe(nodeAllocated.architecture)
    expect(wrapper.get('dl div#memory dd').text()).toBe(`${nodeAllocated.real_memory}MB`)
    expect(wrapper.get('dl div#partitions dd').text()).toBe(nodeAllocated.partitions[0])
  })
})
