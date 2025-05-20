import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import nodeDown from '../../assets/node-down.json'
import nodeAllocated from '../../assets/node-allocated.json'
import nodeIdle from '../../assets/node-idle.json'
import nodeMixed from '../../assets/node-mixed.json'

describe('NodeMainState.vue', () => {
  // tests with specific values
  test('badge down node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['DOWN']
      }
    })
    expect(wrapper.get('span').classes('bg-red-100')).toBe(true)
    expect(wrapper.get('span').classes('text-red-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('DOWN')
  })
  test('badge error node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['ERROR']
      }
    })
    expect(wrapper.get('span').classes('bg-red-100')).toBe(true)
    expect(wrapper.get('span').classes('text-red-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('ERROR')
  })
  test('badge fail node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['IDLE', 'FAIL']
      }
    })
    expect(wrapper.get('span').classes('bg-red-100')).toBe(true)
    expect(wrapper.get('span').classes('text-red-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('FAIL')
  })
  test('badge failing node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['ALLOCATED', 'FAIL']
      }
    })
    expect(wrapper.get('span').classes('bg-red-100')).toBe(true)
    expect(wrapper.get('span').classes('text-red-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('FAILING')
  })
  test('badge drain node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['IDLE', 'DRAIN']
      }
    })
    expect(wrapper.get('span').classes('bg-fuchsia-100')).toBe(true)
    expect(wrapper.get('span').classes('text-fuchsia-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-fuchsia-700')).toBe(true)
    expect(wrapper.get('span').text()).toBe('DRAIN')
  })
  test('badge draining node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['ALLOCATED', 'DRAIN']
      }
    })
    expect(wrapper.get('span').classes('bg-fuchsia-100')).toBe(true)
    expect(wrapper.get('span').classes('text-fuchsia-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-fuchsia-300')).toBe(true)
    expect(wrapper.get('span').text()).toBe('DRAINING')
  })
  test('badge future node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['FUTURE']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-gray-300')).toBe(true)
    expect(wrapper.get('span').text()).toBe('FUTURE')
  })
  test('badge idle node', () => {
    const wrapper = mount(NodeMainState, {
      props: {
        status: ['IDLE']
      }
    })
    expect(wrapper.get('span').classes('bg-green-100')).toBe(true)
    expect(wrapper.get('span').classes('text-green-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('UP')
  })
  // tests with assets
  test('badge asset down node', () => {
    const node = { ...nodeDown }
    const wrapper = mount(NodeMainState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('bg-red-100')).toBe(true)
    expect(wrapper.get('span').classes('text-red-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('DOWN')
  })
  test('badge asset allocated node', () => {
    const node = { ...nodeAllocated }
    const wrapper = mount(NodeMainState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('bg-green-100')).toBe(true)
    expect(wrapper.get('span').classes('text-green-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('UP')
  })
  test('badge asset mixed node', () => {
    const node = { ...nodeMixed }
    const wrapper = mount(NodeMainState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('bg-green-100')).toBe(true)
    expect(wrapper.get('span').classes('text-green-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('UP')
  })
  test('badge asset idle node', () => {
    const node = { ...nodeIdle }
    const wrapper = mount(NodeMainState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('bg-green-100')).toBe(true)
    expect(wrapper.get('span').classes('text-green-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('UP')
  })
})
