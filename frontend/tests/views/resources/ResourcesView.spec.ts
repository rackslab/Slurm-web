import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramThumbnail from '@/components/resources/ResourcesDiagramThumbnail.vue'
import ResourcesFiltersBar from '@/components/resources/ResourcesFiltersBar.vue'
import ResourcesView from '@/views/resources/ResourcesView.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterNode } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'
import nodes from '../../assets/nodes.json'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterNode[]>()

let router: RouterMock

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesView.vue', () => {
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
  test('display resources', () => {
    mockClusterDataPoller.data.value = nodes
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagramThumbnail: true
        }
      }
    })
    // Check presence of ResourcesDiagramThumbnail component
    wrapper.getComponent(ResourcesDiagramThumbnail)
    // Check presence of ResourcesFiltersBar component
    wrapper.getComponent(ResourcesFiltersBar)
    // Check presence of table
    wrapper.get('main table')
  })
  test('table without diagram when racksdb is disabled', () => {
    mockClusterDataPoller.data.value = nodes
    // Disable racksdb on cluster foo
    useRuntimeStore().availableClusters[0].racksdb = false
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagramThumbnail: true
        }
      }
    })
    // Check absence of ResourcesDiagramThumbnail component
    expect(wrapper.findComponent(ResourcesDiagramThumbnail).exists()).toBeFalsy()
    // Check presence of table
    wrapper.get('main table')
  })
  test('show error alert when unable to retrieve nodes', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagramThumbnail: true
        }
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe(
      'Unable to retrieve nodes from cluster foo'
    )
    // Check absence of main table
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })
  test('syncs filters with URL on mount and on change', async () => {
    const runtime = useRuntimeStore()
    mockClusterDataPoller.data.value = nodes
    const wrapper = mount(ResourcesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramThumbnail: true } }
    })
    // onMounted should push initial query when none is set
    expect(router.push).toHaveBeenCalled()

    // simulate store filter change and expect another push
    runtime.resources.filters.states = ['up'] as any
    await nextTick()
    expect(router.push).toHaveBeenCalledTimes(2)
  })
})
