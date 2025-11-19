import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import JobBackButton from '@/components/job/JobBackButton.vue'
import { init_plugins } from '../../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

describe('JobBackButton', () => {
  beforeEach(() => {
    router = init_plugins()
    const runtimeStore = useRuntimeStore()
    runtimeStore.currentCluster = {
      name: 'foo',
      permissions: { roles: [], actions: [] },
      racksdb: true,
      infrastructure: 'foo',
      metrics: true,
      cache: true
    }
    // Mock jobs.query() to return empty object by default
    runtimeStore.jobs.query = vi.fn(() => ({}))
  })

  test('redirects to jobs list without query parameters', async () => {
    router.setQuery({})
    const wrapper = mount(JobBackButton, {
      props: {
        cluster: 'foo'
      }
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Back to jobs')
    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'jobs',
      params: { cluster: 'foo' },
      query: {}
    })
  })

  test('redirects to node view when returnTo=node and nodeName is present', async () => {
    router.setQuery({ returnTo: 'node', nodeName: 'cn1' })
    const wrapper = mount(JobBackButton, {
      props: {
        cluster: 'foo'
      }
    })

    expect(wrapper.text()).toContain('Back to node')
    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'node',
      params: { cluster: 'foo', nodeName: 'cn1' }
    })
  })

  test('redirects to jobs list when returnTo is not node', async () => {
    router.setQuery({ returnTo: 'something-else' })
    const wrapper = mount(JobBackButton, {
      props: {
        cluster: 'foo'
      }
    })

    expect(wrapper.text()).toContain('Back to jobs')
    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'jobs',
      params: { cluster: 'foo' },
      query: {}
    })
  })

  test('redirects to jobs list when returnTo=node but nodeName is missing', async () => {
    router.setQuery({ returnTo: 'node' })
    const wrapper = mount(JobBackButton, {
      props: {
        cluster: 'foo'
      }
    })

    expect(wrapper.text()).toContain('Back to jobs')
    await wrapper.find('button').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'jobs',
      params: { cluster: 'foo' },
      query: {}
    })
  })
})
