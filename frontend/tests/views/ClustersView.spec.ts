import { describe, test, expect, beforeEach, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ClustersView from '@/views/ClustersView.vue'
import clusters from '../assets/clusters.json'
import { init_plugins } from '../lib/common'
import type { ClusterDescription } from '@/composables/GatewayAPI'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ClusterListItem from '@/components/clusters/ClustersListItem.vue'
import { APIServerError, AuthenticationError } from '@/composables/HTTPErrors'
import { useAuthStore } from '@/stores/auth'

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
    // Set current route to /clusters for testing
    router.currentRoute.value.fullPath = '/clusters'
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
    shallowMount(ClustersView)
    // Wait for result of clusters requests
    await flushPromises()
    // Check redirect to signout on authentication error
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({ name: 'signout' })
    // Check that returnUrl was set to current route
    expect(useAuthStore().returnUrl).toBe('/clusters')
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
  test('auto redirect when a single cluster is available', async () => {
    const singleCluster: ClusterDescription = clusters[0]
    mockGatewayAPI.clusters.mockReturnValueOnce(Promise.resolve([singleCluster]))
    const wrapper = shallowMount(ClustersView)
    await flushPromises()
    const clusterItem = wrapper.findComponent(ClusterListItem)
    expect(clusterItem.exists()).toBe(true)
    clusterItem.vm.$emit('pinged', singleCluster)
    await flushPromises()
    expect(router.push).toHaveBeenCalledWith({
      name: 'dashboard',
      params: { cluster: singleCluster.name }
    })
  })
  test('no redirect when multiple clusters are available', async () => {
    // Check at least 2 clusters are present in test asset
    expect(clusters.length).toBeGreaterThanOrEqual(2)
    mockGatewayAPI.clusters.mockReturnValueOnce(Promise.resolve(clusters))
    const wrapper = shallowMount(ClustersView)
    await flushPromises()
    // Verify cluster list is displayed
    expect(wrapper.get('h1').text()).toBe('Select a cluster')
    expect(wrapper.findAllComponents(ClusterListItem).length).toBe(clusters.length)
    // Emit pinged events from all cluster items
    const clusterItems = wrapper.findAllComponents(ClusterListItem)
    clusterItems.forEach((item, index) => {
      item.vm.$emit('pinged', clusters[index])
    })
    await flushPromises()
    // Verify no redirect was called
    expect(router.push).not.toHaveBeenCalled()
  })
  test('show cluster list when the single cluster has errors', async () => {
    const singleCluster: ClusterDescription = clusters[0]
    mockGatewayAPI.clusters.mockReturnValueOnce(Promise.resolve([singleCluster]))
    const wrapper = shallowMount(ClustersView)
    await flushPromises()
    singleCluster.error = true
    wrapper.findComponent(ClusterListItem).vm.$emit('pinged', singleCluster)
    await flushPromises()
    expect(router.push).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ClusterListItem).exists()).toBe(true)
  })
})
