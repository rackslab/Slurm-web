import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramThumbnail from '@/components/resources/ResourcesDiagramThumbnail.vue'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'

let router: RouterMock

describe('ResourcesDiagramThumbnail.vue', () => {
  beforeEach(() => {
    router = init_plugins()
  })
  test('display resources diagram', async () => {
    mount(ResourcesDiagramThumbnail, {
      props: {
        cluster: 'foo',
        nodes: nodes
      },
      global: {
        stubs: {
          ResourcesCanvas: true
        }
      }
    })
  })

  test('passes loading prop to ResourcesCanvas when data is loading', () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        loading: true
      },
      global: {
        stubs: {
          ResourcesCanvas: true
        }
      }
    })
    const canvas = wrapper.getComponent({ name: 'ResourcesCanvas' })
    expect(canvas.props('loading')).toBe(true)
  })

  test('passes loading prop to ResourcesCanvas when data is loaded', () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        loading: false
      },
      global: {
        stubs: {
          ResourcesCanvas: true
        }
      }
    })
    const canvas = wrapper.getComponent({ name: 'ResourcesCanvas' })
    expect(canvas.props('loading')).toBe(false)
  })

  test('passes mode prop to ResourcesCanvas', () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        mode: 'cores'
      },
      global: {
        stubs: {
          ResourcesCanvas: true
        }
      }
    })
    const canvas = wrapper.getComponent({ name: 'ResourcesCanvas' })
    expect(canvas.props('mode')).toBe('cores')
  })

  test('clicking fullscreen navigates to resources-diagram-nodes', async () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: { cluster: 'foo', nodes },
      global: { stubs: { ResourcesCanvas: true } }
    })
    await wrapper.trigger('mouseover')
    await wrapper.get('[data-testid="resources-thumbnail-fullscreen"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-nodes',
      params: { cluster: 'foo' }
    })
  })

  test('clicking fullscreen navigates to resources-diagram-cores in cores mode', async () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: { cluster: 'foo', nodes, mode: 'cores' },
      global: { stubs: { ResourcesCanvas: true } }
    })
    await wrapper.trigger('mouseover')
    await wrapper.get('[data-testid="resources-thumbnail-fullscreen"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-cores',
      params: { cluster: 'foo' }
    })
  })

  test('clicking cores mode switch updates runtime store representation', async () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: { cluster: 'foo', nodes, mode: 'nodes' },
      global: { stubs: { ResourcesCanvas: true } }
    })
    await wrapper.trigger('mouseover')
    await wrapper.get('[data-testid="resources-thumbnail-mode-cores"]').trigger('click')
    expect(useRuntimeStore().resources.representation).toBe('cores')
  })
})
