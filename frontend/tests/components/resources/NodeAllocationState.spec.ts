import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import nodeDown from '../../assets/node-down.json'
import nodeAllocated from '../../assets/node-allocated.json'
import nodeIdle from '../../assets/node-idle.json'
import nodeMixed from '../../assets/node-mixed.json'

describe('NodeAllocationState.vue', () => {
  // tests with specific values
  test('badge allocated node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['ALLOCATED']
      }
    })
    expect(wrapper.get('span').classes('fill-orange-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toBe('ALLOCATED')
  })
  test('badge mixed node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['MIXED']
      }
    })
    expect(wrapper.get('span').classes('fill-yellow-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toBe('MIXED')
  })
  test('badge idle node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['IDLE']
      }
    })
    expect(wrapper.get('span').classes('fill-green-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toBe('IDLE')
  })
  test('badge planned node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['IDLE', 'PLANNED']
      }
    })
    expect(wrapper.get('span').classes('fill-green-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toBe('PLANNED')
  })
  test('badge down node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['DOWN']
      }
    })
    expect(wrapper.get('span').classes('fill-red-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeTruthy()
    expect(wrapper.get('span').text()).toBe('UNAVAILABLE')
  })
  test('badge error node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['ERROR']
      }
    })
    expect(wrapper.get('span').classes('fill-red-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeTruthy()
    expect(wrapper.get('span').text()).toBe('UNAVAILABLE')
  })
  test('badge future node', () => {
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: ['FUTURE']
      }
    })
    expect(wrapper.get('span').classes('fill-red-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeTruthy()
    expect(wrapper.get('span').text()).toBe('UNAVAILABLE')
  })
  // tests with assets
  test('badge asset down node', () => {
    const node = { ...nodeDown }
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('fill-red-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeTruthy()
    expect(wrapper.get('span').text()).toBe('UNAVAILABLE')
  })
  test('badge asset allocated node', () => {
    const node = { ...nodeAllocated }
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('fill-orange-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toBe('ALLOCATED')
  })
  test('badge asset allocated node', () => {
    const node = { ...nodeIdle }
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('fill-green-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toSatisfy((value) => ['IDLE', 'PLANNED'].includes(value))
  })
  test('badge asset mixed node', () => {
    const node = { ...nodeMixed }
    const wrapper = mount(NodeAllocationState, {
      props: {
        status: node.state
      }
    })
    expect(wrapper.get('span').classes('fill-yellow-500')).toBeTruthy()
    expect(wrapper.get('span').classes('opacity-30')).toBeFalsy()
    expect(wrapper.get('span').text()).toBe('MIXED')
  })
})
