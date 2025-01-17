import { describe, test, expect, beforeEach, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ClustersView from '@/views/ClustersView.vue'
import clusters from '../assets/clusters.json'
import { init_plugins } from '../lib/common'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ClusterListItem from '@/components/clusters/ClustersListItem.vue'
import { APIServerError, AuthenticationError } from '@/composables/HTTPErrors'

const mockGatewayAPI = {
  clusters: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

let router

describe('ClustersView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
  })
  test('display clusters list', async () => {
    // Check at least one cluster is present in test asset or the test is pointless.
    expect(clusters.length).toBeGreaterThan(0)
    mockGatewayAPI.clusters.mockReturnValueOnce(Promise.resolve(clusters))
    const wrapper = shallowMount(ClustersView)
    // Wait for result of clusters requests
    await flushPromises()
    // Check page title
    expect(wrapper.get('h1').text()).toBe('Select a cluster')
    // Check there are as many ClusterListItem as the number of clusters in test asset.
    expect(wrapper.findAllComponents(ClusterListItem).length).toBe(clusters.length)
  })
  test('show loading spinner before loaded', async () => {
    const wrapper = shallowMount(ClustersView)
    wrapper.getComponent(LoadingSpinner)
    expect(wrapper.get('div').text()).toBe('Loading clusters…')
  })
  test('authentication error', async () => {
    mockGatewayAPI.clusters.mockImplementationOnce(() => {
      throw new AuthenticationError('fake authentication error')
    })
    const wrapper = shallowMount(ClustersView)
    // Wait for result of clusters requests
    await flushPromises()
    // Check redirect to signout on authentication error
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({ name: 'signout' })
  })
  test('server error', async () => {
    mockGatewayAPI.clusters.mockImplementationOnce(() => {
      throw new APIServerError(500, 'fake error')
    })
    const wrapper = shallowMount(ClustersView)
    // Wait for result of clusters requests
    await flushPromises()
    expect(wrapper.get('div h3').text()).toBe('Unable to load cluster list')
  })
})
