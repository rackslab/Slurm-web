import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramNodesView from '@/views/resources/ResourcesDiagramNodesView.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterNode } from '@/composables/GatewayAPI'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterNode[]>()

let router: RouterMock

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesDiagramNodesView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
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
  test('renders fullscreen canvas and close button', () => {
    const wrapper = mount(ResourcesDiagramNodesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesCanvas: true } }
    })
    // close button exists
    wrapper.get('button')
    // ResourcesCanvas is present
    wrapper.getComponent(ResourcesCanvas)
  })
  test('close navigates back to resources', async () => {
    const wrapper = mount(ResourcesDiagramNodesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesCanvas: true } }
    })
    await wrapper.get('button').trigger('click')
    expect(router.push).toHaveBeenCalledWith({ name: 'resources', params: { cluster: 'foo' } })
  })
  test('syncs filters with URL on mount and on change', async () => {
    const runtime = useRuntimeStore()
    mockClusterDataPoller.data.value = []
    const wrapper = mount(ResourcesDiagramNodesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesCanvas: true } }
    })
    expect(router.push).toHaveBeenCalled()

    runtime.resources.filters.partitions = ['p1']
    await nextTick()
    expect(router.push).toHaveBeenCalledTimes(2)
  })
})
