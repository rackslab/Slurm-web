import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesView from '@/views/ResourcesView.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterNode } from '@/composables/GatewayAPI'
import ResourcesDiagram from '@/components/resources/ResourcesDiagram.vue'
import ResourcesFiltersBar from '@/components/resources/ResourcesFiltersBar.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import nodes from '../assets/nodes.json'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterNode[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesView.vue', () => {
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
  test('display resources', () => {
    mockClusterDataPoller.data.value = nodes
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagram: true
        }
      }
    })
    // Check presence of ResourcesDiagram component
    wrapper.getComponent(ResourcesDiagram)
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
          ResourcesDiagram: true
        }
      }
    })
    // Check absence of ResourcesDiagram component
    expect(wrapper.findComponent(ResourcesDiagram).exists()).toBeFalsy()
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
          ResourcesDiagram: true
        }
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe(
      'Unable to retrieve nodes from cluster foo'
    )
    // Check absence of main table
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })

})
