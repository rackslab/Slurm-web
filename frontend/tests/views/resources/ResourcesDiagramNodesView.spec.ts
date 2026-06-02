import { describe, test, beforeEach, vi, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramNodesView from '@/views/resources/ResourcesDiagramNodesView.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmNode[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesDiagramNodesView.vue', () => {
  beforeEach(() => {
    init_plugins()
  })

  test('renders ResourcesDiagramGeneric with nodes mode', () => {
    const wrapper = mount(ResourcesDiagramNodesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramGeneric: true } }
    })
    // ResourcesDiagramGeneric is present
    wrapper.getComponent(ResourcesDiagramGeneric)
  })

  test('passes correct props to ResourcesDiagramGeneric', () => {
    const wrapper = mount(ResourcesDiagramNodesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramGeneric: true } }
    })
    const diagramView = wrapper.getComponent(ResourcesDiagramGeneric)
    expect(diagramView.props('cluster')).toBe('foo')
    expect(diagramView.props('mode')).toBe('nodes')
  })
})
