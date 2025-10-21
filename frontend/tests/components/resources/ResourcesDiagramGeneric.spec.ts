import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterNode } from '@/composables/GatewayAPI'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import ResourcesDiagramNavigation from '@/components/resources/ResourcesDiagramNavigation.vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterNode[]>()

let router: RouterMock

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesDiagramGeneric.vue', () => {
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

  describe('nodes mode', () => {
    test('renders fullscreen canvas and navigation component', () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      // ResourcesCanvas is present
      wrapper.getComponent(ResourcesCanvas)
      // ResourcesDiagramNavigation is present
      wrapper.getComponent(ResourcesDiagramNavigation)
    })

    test('passes correct props to ResourcesCanvas in nodes mode', () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const canvas = wrapper.getComponent(ResourcesCanvas)
      expect(canvas.props('mode')).toBe('nodes')
    })

    test('passes correct props to ResourcesDiagramNavigation in nodes mode', () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const navigation = wrapper.getComponent(ResourcesDiagramNavigation)
      expect(navigation.props('currentView')).toBe('nodes')
    })

    test('close navigates back to resources', async () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const buttons = wrapper.findAll('button')
      await buttons[0].trigger('click')
      expect(router.push).toHaveBeenCalledWith({ name: 'resources', params: { cluster: 'foo' } })
    })

    test('syncs filters with URL on mount and on change', async () => {
      const runtime = useRuntimeStore()
      mockClusterDataPoller.data.value = []
      mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      expect(router.push).toHaveBeenCalled()

      runtime.resources.filters.partitions = ['p1']
      await nextTick()
      expect(router.push).toHaveBeenCalledTimes(2)
    })
  })

  describe('cores mode', () => {
    test('renders fullscreen canvas and navigation component', () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      // ResourcesCanvas is present
      wrapper.getComponent(ResourcesCanvas)
      // ResourcesDiagramNavigation is present
      wrapper.getComponent(ResourcesDiagramNavigation)
    })

    test('passes correct props to ResourcesCanvas in cores mode', () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const canvas = wrapper.getComponent(ResourcesCanvas)
      expect(canvas.props('mode')).toBe('cores')
    })

    test('passes correct props to ResourcesDiagramNavigation in cores mode', () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const navigation = wrapper.getComponent(ResourcesDiagramNavigation)
      expect(navigation.props('currentView')).toBe('cores')
    })

    test('close navigates back to resources', async () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const buttons = wrapper.findAll('button')
      await buttons[0].trigger('click')
      expect(router.push).toHaveBeenCalledWith({ name: 'resources', params: { cluster: 'foo' } })
    })

    test('syncs filters with URL on mount and on change', async () => {
      const runtime = useRuntimeStore()
      mockClusterDataPoller.data.value = []
      mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      expect(router.push).toHaveBeenCalled()

      runtime.resources.filters.partitions = ['p1']
      await nextTick()
      expect(router.push).toHaveBeenCalledTimes(2)
    })
  })
})
