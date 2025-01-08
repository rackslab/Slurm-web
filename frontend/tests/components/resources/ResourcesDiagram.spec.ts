import { describe, test, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagram from '@/components/resources/ResourcesDiagram.vue'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'

describe('ResourcesDiagram.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('display resources diagram', async () => {
    const wrapper = mount(ResourcesDiagram, {
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
