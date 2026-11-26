import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramNavigation from '@/components/resources/ResourcesDiagramNavigation.vue'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

describe('ResourcesDiagramNavigation.vue', () => {
  beforeEach(() => {
    router = init_plugins()
  })

  test('renders navigation buttons for nodes view', () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'nodes'
      }
    })

    const nodes = wrapper.get('[data-testid="resources-diagram-mode-nodes"]')
    const cores = wrapper.get('[data-testid="resources-diagram-mode-cores"]')
    expect(nodes.classes()).toContain('bg-slurmweb')
    expect(nodes.text()).toBe('Nodes')
    expect(cores.classes()).not.toContain('bg-slurmweb')
    expect(cores.text()).toBe('Cores')
  })

  test('renders navigation buttons for cores view', () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'cores'
      }
    })

    expect(wrapper.get('[data-testid="resources-diagram-mode-cores"]').classes()).toContain(
      'bg-slurmweb'
    )
    expect(wrapper.get('[data-testid="resources-diagram-mode-nodes"]').classes()).not.toContain(
      'bg-slurmweb'
    )
  })

  test('nodes button navigates to resources-diagram-nodes', async () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'cores'
      }
    })

    await wrapper.get('[data-testid="resources-diagram-mode-nodes"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-nodes',
      params: { cluster: 'foo' },
      query: {}
    })
  })

  test('cores button navigates to resources-3d-cores in 3D keeping filters', async () => {
    const runtimeStore = useRuntimeStore()
    runtimeStore.resources.filters.states = ['down']
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'nodes',
        layout: '3d'
      }
    })

    await wrapper.get('[data-testid="resources-diagram-mode-cores"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-3d-cores',
      params: { cluster: 'foo' },
      query: { states: 'down' }
    })
  })

  test('renders 2D layout active by default', () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: { cluster: 'foo', currentView: 'nodes' }
    })
    expect(wrapper.get('[data-testid="resources-diagram-layout-2d"]').classes()).toContain(
      'bg-slurmweb'
    )
    expect(wrapper.get('[data-testid="resources-diagram-layout-3d"]').classes()).not.toContain(
      'bg-slurmweb'
    )
  })

  test('renders 3D layout active', () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: { cluster: 'foo', currentView: 'nodes', layout: '3d' }
    })
    expect(wrapper.get('[data-testid="resources-diagram-layout-3d"]').classes()).toContain(
      'bg-slurmweb'
    )
  })

  test('layout buttons navigate to routes of layouts keeping representation and filters', async () => {
    useRuntimeStore().resources.filters.partitions = ['normal']
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: { cluster: 'foo', currentView: 'cores' }
    })
    await wrapper.get('[data-testid="resources-diagram-layout-3d"]').trigger('click')
    expect(router.push).toHaveBeenLastCalledWith({
      name: 'resources-3d-cores',
      params: { cluster: 'foo' },
      query: { partitions: 'normal' }
    })
    await wrapper.setProps({ layout: '3d' })
    await wrapper.get('[data-testid="resources-diagram-layout-2d"]').trigger('click')
    expect(router.push).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'resources-diagram-cores' })
    )
  })
})
