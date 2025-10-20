import { describe, test, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramThumbnail from '@/components/resources/ResourcesDiagramThumbnail.vue'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'

describe('ResourcesDiagramThumbnail.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('display resources diagram', async () => {
    const wrapper = mount(ResourcesDiagramThumbnail, {
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
})
