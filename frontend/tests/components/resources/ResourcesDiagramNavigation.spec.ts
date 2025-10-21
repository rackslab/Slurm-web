import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramNavigation from '@/components/resources/ResourcesDiagramNavigation.vue'
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

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)

    // Check that nodes button is active
    expect(buttons[0].classes()).toContain('bg-slurmweb')
    expect(buttons[0].text()).toBe('Nodes')

    // Check that cores button is not active
    expect(buttons[1].classes()).not.toContain('bg-slurmweb')
    expect(buttons[1].text()).toBe('Cores')
  })

  test('renders navigation buttons for cores view', () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'cores'
      }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)

    // Check that cores button is active
    expect(buttons[1].classes()).toContain('bg-slurmweb')
    expect(buttons[1].text()).toBe('Cores')

    // Check that nodes button is not active
    expect(buttons[0].classes()).not.toContain('bg-slurmweb')
    expect(buttons[0].text()).toBe('Nodes')
  })

  test('nodes button navigates to resources-diagram-nodes', async () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'cores'
      }
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-nodes',
      params: { cluster: 'foo' }
    })
  })

  test('cores button navigates to resources-diagram-cores', async () => {
    const wrapper = mount(ResourcesDiagramNavigation, {
      props: {
        cluster: 'foo',
        currentView: 'nodes'
      }
    })

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-cores',
      params: { cluster: 'foo' }
    })
  })
})
