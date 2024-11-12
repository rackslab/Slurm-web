import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeView from '@/views/NodeView.vue'
import { init_plugins, getMockClusterDataPoller } from './common'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterNode } from '@/composables/GatewayAPI'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import nodeAllocated from '../assets/node-allocated.json'
import { nextTick } from 'vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterNode>()
vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('NodeView.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().availableClusters = [
      { name: 'foo', permissions: { roles: [], actions: [] }, infrastructure: 'foo', metrics: true }
    ]
  })
  test('display node details', async () => {
    mockClusterDataPoller.data.value = nodeAllocated
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
    expect(wrapper.get('dl div#cpu dd').text()).toBe(
      `${nodeAllocated.sockets} x ${nodeAllocated.cores} = ${nodeAllocated.cpus}`
    )
    expect(wrapper.get('dl div#arch dd').text()).toBe(nodeAllocated.architecture)
    expect(wrapper.get('dl div#memory dd').text()).toBe(`${nodeAllocated.real_memory}MB`)
    expect(wrapper.get('dl div#partitions dd').text()).toBe(nodeAllocated.partitions[0])
  })
})
