import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramNavigation from '@/components/resources/ResourcesDiagramNavigation.vue'
import { init_plugins } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'

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

    expect(wrapper.get('[data-testid="resources-diagram-layout-2d"]').classes()).toContain(
      'bg-slurmweb'
    )
    expect(wrapper.get('[data-testid="resources-diagram-layout-3d"]').classes()).not.toContain(
      'bg-slurmweb'
    )
    expect(wrapper.get('[data-testid="resources-diagram-mode-nodes"]').classes()).toContain(
      'bg-slurmweb'
    )
    expect(wrapper.get('[data-testid="resources-diagram-mode-cores"]').classes()).not.toContain(
      'bg-slurmweb'
    )
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

  test('cores button navigates to resources-diagram-cores', async () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'nodes'
      }
    })

    await wrapper.get('[data-testid="resources-diagram-mode-cores"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-cores',
      params: { cluster: 'foo' },
      query: {}
    })
  })

  test('3D button selects the 3D layout', async () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'nodes'
      }
    })

    await wrapper.get('[data-testid="resources-diagram-layout-3d"]').trigger('click')

    expect(useRuntimeStore().resources.layout).toBe('3d')
    expect(wrapper.get('[data-testid="resources-diagram-layout-3d"]').classes()).toContain(
      'bg-slurmweb'
    )
  })
})
