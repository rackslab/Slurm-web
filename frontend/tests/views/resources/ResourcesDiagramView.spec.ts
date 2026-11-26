import { describe, test, beforeEach, vi, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramView from '@/views/resources/ResourcesDiagramView.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmNode[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesDiagramView.vue', () => {
  beforeEach(() => {
    init_plugins()
  })

  test.each([
    ['nodes', '2d'],
    ['cores', '2d'],
    ['nodes', '3d'],
    ['cores', '3d']
  ] as const)('renders ResourcesDiagramGeneric in %s mode with %s layout', (mode, layout) => {
    const wrapper = mount(ResourcesDiagramView, {
      props: { cluster: 'foo', mode, layout },
      global: { stubs: { ResourcesDiagramGeneric: true } }
    })
    const diagram = wrapper.getComponent(ResourcesDiagramGeneric)
    expect(diagram.props('cluster')).toBe('foo')
    expect(diagram.props('mode')).toBe(mode)
    expect(diagram.props('layout')).toBe(layout)
  })

  test('uses 2D layout by default', () => {
    const wrapper = mount(ResourcesDiagramView, {
      props: { cluster: 'foo', mode: 'cores' },
      global: { stubs: { ResourcesDiagramGeneric: true } }
    })
    expect(wrapper.getComponent(ResourcesDiagramGeneric).props('layout')).toBe('2d')
  })
})
