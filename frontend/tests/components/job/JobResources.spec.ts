import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobResources from '@/components/job/JobResources.vue'

describe('JobResources.vue', () => {
  test('job with gpus', () => {
    const wrapper = mount(JobResources, {
      props: {
        tres: [
          {
            count: 128,
            id: 1,
            name: '',
            type: 'cpu'
          },
          {
            count: 65536,
            id: 2,
            name: '',
            type: 'mem'
          },
          {
            count: 1,
            id: 4,
            name: '',
            type: 'node'
          },
          {
            count: 128,
            id: 5,
            name: '',
            type: 'billing'
          }
        ],
        gpu: { count: 4, reliable: true }
      }
    })
    const items = wrapper.findAll('li')
    expect(items.length).toBe(4)
    expect(items[0].text()).toBe('Nodes: 1')
    expect(items[1].text()).toBe('CPU: 128')
    expect(items[2].text()).toBe('Memory: 64GB')
    expect(items[3].text()).toBe('GPU: 4')
  })
  test('job without gpu', () => {
    const wrapper = mount(JobResources, {
      props: {
        tres: [
          {
            count: 128,
            id: 1,
            name: '',
            type: 'cpu'
          },
          {
            count: 65536,
            id: 2,
            name: '',
            type: 'mem'
          },
          {
            count: 1,
            id: 4,
            name: '',
            type: 'node'
          },
          {
            count: 128,
            id: 5,
            name: '',
            type: 'billing'
          }
        ],
        gpu: { count: 0, reliable: true }
      }
    })
    const items = wrapper.findAll('li')
    expect(items.length).toBe(3)
    expect(items[0].text()).toBe('Nodes: 1')
    expect(items[1].text()).toBe('CPU: 128')
    expect(items[2].text()).toBe('Memory: 64GB')
  })
  test('job with unreliable gpus count', () => {
    const wrapper = mount(JobResources, {
      props: {
        tres: [
          {
            count: 128,
            id: 1,
            name: '',
            type: 'cpu'
          },
          {
            count: 65536,
            id: 2,
            name: '',
            type: 'mem'
          },
          {
            count: 1,
            id: 4,
            name: '',
            type: 'node'
          },
          {
            count: 128,
            id: 5,
            name: '',
            type: 'billing'
          }
        ],
        gpu: { count: 4, reliable: false }
      }
    })
    const items = wrapper.findAll('li')
    expect(items.length).toBe(4)
    expect(items[3].text()).toBe('GPU: 4 ~')
  })
})
