import { describe, test, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { init_plugins } from '../lib/common'
import { XCircleIcon } from '@heroicons/vue/20/solid'

describe('ErrorAlert.vue', () => {
  beforeEach(() => {
    init_plugins()
  })

  test('renders error alert with default content', () => {
    const wrapper = shallowMount(ErrorAlert, {
      slots: {
        default: 'Test error message'
      }
    })

    expect(wrapper.text()).toContain('Test error message')
    expect(wrapper.findComponent(XCircleIcon).exists()).toBe(true)
  })

  test('hides errors link when showErrorsLink is false', () => {
    const wrapper = shallowMount(ErrorAlert, {
      props: {
        showErrorsLink: false
      },
      slots: {
        default: 'Test error message'
      }
    })

    expect(wrapper.findComponent(RouterLink).exists()).toBeFalsy()
  })

  test('shows errors link when showErrorsLink is true', () => {
    const wrapper = shallowMount(ErrorAlert, {
      props: {
        showErrorsLink: true
      },
      slots: {
        default: 'Test error message'
      }
    })

    const routerLink = wrapper.findComponent(RouterLink)
    expect(routerLink.exists()).toBe(true)
    expect(routerLink.props('to')).toEqual({ name: 'settings-errors' })
  })

  test('shows errors link by default', () => {
    const wrapper = shallowMount(ErrorAlert, {
      slots: {
        default: 'Test error message'
      }
    })

    const routerLink = wrapper.findComponent(RouterLink)
    expect(routerLink.exists()).toBe(true)
    expect(routerLink.props('to')).toEqual({ name: 'settings-errors' })
  })
})
