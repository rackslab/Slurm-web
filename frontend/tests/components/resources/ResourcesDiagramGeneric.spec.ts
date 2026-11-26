import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import ResourcesDiagramNavigation from '@/components/resources/ResourcesDiagramNavigation.vue'
import ResourcesScene3D from '@/components/resources/ResourcesScene3D.vue'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmNode[]>()

let router: RouterMock

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

// Never resolve 3D representation request and mock the viewer to avoid loading
// three.js and WebGL in tests.
vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => ({ infrastructureGlb: () => new Promise(() => {}) })
}))
vi.mock('@/lib/resources3d/viewer', () => ({ createResourcesViewer: vi.fn() }))

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
        cache: true,
        slurmdbd: {
          jobs_max_hours: 168
        }
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

    test('passes loading prop to ResourcesCanvas when data is loading', () => {
      mockClusterDataPoller.loaded.value = false
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const canvas = wrapper.getComponent(ResourcesCanvas)
      expect(canvas.props('loading')).toBe(true)
    })

    test('passes loading prop to ResourcesCanvas when data is loaded', () => {
      mockClusterDataPoller.loaded.value = true
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const canvas = wrapper.getComponent(ResourcesCanvas)
      expect(canvas.props('loading')).toBe(false)
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

    test('passes loading prop to ResourcesCanvas when data is loading in cores mode', () => {
      mockClusterDataPoller.loaded.value = false
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const canvas = wrapper.getComponent(ResourcesCanvas)
      expect(canvas.props('loading')).toBe(true)
    })

    test('passes loading prop to ResourcesCanvas when data is loaded in cores mode', () => {
      mockClusterDataPoller.loaded.value = true
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      const canvas = wrapper.getComponent(ResourcesCanvas)
      expect(canvas.props('loading')).toBe(false)
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

  describe('3d layout', () => {
    test('renders 3D scene instead of canvas', async () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'cores', layout: '3d' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      await flushPromises()
      expect(wrapper.findComponent(ResourcesCanvas).exists()).toBe(false)
      const scene = wrapper.getComponent(ResourcesScene3D)
      expect(scene.props('cluster')).toBe('foo')
      expect(scene.props('mode')).toBe('cores')
      expect(wrapper.getComponent(ResourcesDiagramNavigation).props('layout')).toBe('3d')
    })

    test('renders canvas with 2D layout by default', async () => {
      const wrapper = mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      await flushPromises()
      expect(wrapper.findComponent(ResourcesScene3D).exists()).toBe(false)
      wrapper.getComponent(ResourcesCanvas)
      expect(wrapper.getComponent(ResourcesDiagramNavigation).props('layout')).toBe('2d')
    })

    test('syncs filters with URL of 3D route', async () => {
      mockClusterDataPoller.data.value = []
      mount(ResourcesDiagramGeneric, {
        props: { cluster: 'foo', mode: 'nodes', layout: '3d' },
        global: { stubs: { ResourcesCanvas: true, ResourcesDiagramNavigation: true } }
      })
      useRuntimeStore().resources.filters.states = ['down']
      await nextTick()
      expect(router.push).toHaveBeenLastCalledWith({
        name: 'resources-3d-nodes',
        params: { cluster: 'foo' },
        query: { states: 'down' }
      })
    })
  })
})
