import { describe, test, beforeEach, vi, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramCoresView from '@/views/resources/ResourcesDiagramCoresView.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'
import type { ClusterNode } from '@/composables/GatewayAPI'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterNode[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesDiagramCoresView.vue', () => {
  beforeEach(() => {
    init_plugins()
  })

  test('renders ResourcesDiagramGeneric with cores mode', () => {
    const wrapper = mount(ResourcesDiagramCoresView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramGeneric: true } }
    })
    // ResourcesDiagramGeneric is present
    wrapper.getComponent(ResourcesDiagramGeneric)
  })

  test('passes correct props to ResourcesDiagramGeneric', () => {
    const wrapper = mount(ResourcesDiagramCoresView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramGeneric: true } }
    })
    const diagramView = wrapper.getComponent(ResourcesDiagramGeneric)
    expect(diagramView.props('cluster')).toBe('foo')
    expect(diagramView.props('mode')).toBe('cores')
  })
})
