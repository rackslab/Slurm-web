import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeGPU from '@/components/resources/NodeGPU.vue'
import nodes from '../../assets/nodes.json'

describe('NodeGPU.vue', () => {
  test('node with gpus', () => {
    const node = { ...nodes[0] }
    node.gres = 'gpu:h100:2'
    const wrapper = mount(NodeGPU, {
      props: {
        node: node
      }
    })
    expect(wrapper.get('span').classes()).toContain('text-gray-500')
    expect(wrapper.text()).toBe('2 x h100')
  })
  test('node without gpus', () => {
    const node = { ...nodes[0] }
    node.gres = ''
    const wrapper = mount(NodeGPU, {
      props: {
        node: node
      }
    })
    expect(wrapper.get('span').classes()).toContain('text-gray-400')
    expect(wrapper.text()).toBe('-')
  })
})
