import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramThumbnail from '@/components/resources/ResourcesDiagramThumbnail.vue'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'
import type { RouterMock } from 'vue-router-mock'

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

  test('clicking fullscreen navigates to resources-diagram-nodes', async () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
      props: { cluster: 'foo', nodes },
      global: { stubs: { ResourcesCanvas: true } }
    })
    await wrapper.trigger('mouseover')
    await wrapper.find('button').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-nodes',
      params: { cluster: 'foo' }
    })
  })
})
