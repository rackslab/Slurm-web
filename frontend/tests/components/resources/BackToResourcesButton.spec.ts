import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BackToResourcesButton from '@/components/resources/BackToResourcesButton.vue'
import { init_plugins } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

describe('BackToResourcesButton', () => {
  beforeEach(() => {
    router = init_plugins()
  })

  test('renders correctly with default props', () => {
    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Back to resources')
    // Check for the ChevronLeftIcon by looking for the SVG element
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  test('has correct button type and accessibility attributes', () => {
    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    const button = wrapper.find('button')
    expect(button.attributes('type')).toBe('button')

    // Check that the SVG has aria-hidden="true"
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
  })

  test('navigates to resources by default when no returnTo query param', async () => {
    router.setQuery({})

    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources',
      params: { cluster: 'foo' }
    })
  })

  test('navigates to resources-diagram-nodes when returnTo query param is resources-diagram-nodes', async () => {
    router.setQuery({ returnTo: 'resources-diagram-nodes' })

    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-nodes',
      params: { cluster: 'foo' }
    })
  })

  test('navigates to resources-diagram-cores when returnTo query param is resources-diagram-cores', async () => {
    router.setQuery({ returnTo: 'resources-diagram-cores' })

    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources-diagram-cores',
      params: { cluster: 'foo' }
    })
  })

  test('navigates to resources when returnTo query param is resources', async () => {
    router.setQuery({ returnTo: 'resources' })

    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources',
      params: { cluster: 'foo' }
    })
  })

  test('falls back to resources when returnTo query param is invalid', async () => {
    router.setQuery({ returnTo: 'invalid-route' })

    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources',
      params: { cluster: 'foo' }
    })
  })

  test('falls back to resources when returnTo query param is empty string', async () => {
    router.setQuery({ returnTo: '' })

    const wrapper = mount(BackToResourcesButton, {
      props: {
        cluster: 'foo'
      }
    })

    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'resources',
      params: { cluster: 'foo' }
    })
  })
})
