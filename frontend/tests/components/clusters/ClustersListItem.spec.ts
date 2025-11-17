import { describe, test, expect, beforeEach, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ClusterListItem from '@/components/clusters/ClustersListItem.vue'
import ClusterStats from '@/components/clusters/ClusterStats.vue'
import ping from '../../assets/ping.json'
import { init_plugins } from '../../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import { APIServerError, AuthenticationError } from '@/composables/HTTPErrors'
import { useAuthStore } from '@/stores/auth'

const mockGatewayAPI = {
  ping: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

describe('ClustersListItem.vue', () => {
  let router

  beforeEach(() => {
    router = init_plugins()
    // Set current route to /clusters for testing
    router.currentRoute.value.fullPath = '/clusters'
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true
      }
    ]
    mockGatewayAPI.ping.mockReset()
  })
  test('cluster with permission', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.ping.mockReturnValueOnce(Promise.resolve(ping))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of clusters requests
    await flushPromises()
    // assert stats have been retrieved
    expect(mockGatewayAPI.ping).toBeCalled()
    // Check presence of Slurm version
    expect(wrapper.get('span span').text()).toContain('Slurm ')
    // Check presence of cluster stats component
    wrapper.getComponent(ClusterStats)
    // Check cluster status is available
    expect(wrapper.get('div div p').text()).toBe('Available')
    // Check error flag is false
    expect(useRuntimeStore().getCluster('foo').error).toBeFalsy()
  })
  test('cluster error', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.ping.mockImplementationOnce(() => {
      throw new APIServerError(500, 'fake error')
    })
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of clusters requests
    await flushPromises()
    // assert ping have been retrieved
    expect(mockGatewayAPI.ping).toBeCalled()
    // Check Slurm version is absent
    expect(wrapper.find('span span').exists()).toBeFalsy()
    // Check absence of cluster stats component
    expect(wrapper.findComponent(ClusterStats).exists()).toBeFalsy()
    // Check cluster status informs about ongoing issue
    expect(wrapper.get('div div p').text()).toBe('Ongoing issue')
    // Check error flag is true
    expect(useRuntimeStore().getCluster('foo').error).toBeTruthy()
  })
  test('cluster loading', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.ping.mockReturnValueOnce(Promise.resolve(ping))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // assert ping is being retrieved
    expect(mockGatewayAPI.ping).toBeCalled()
    // Check absence of cluster stats component
    expect(wrapper.findComponent(ClusterStats).exists()).toBeFalsy()
    // Check cluster status is loading
    expect(wrapper.get('div div p').text()).toBe('Loading')
  })
  test('cluster without permission', async () => {
    mockGatewayAPI.ping.mockReturnValueOnce(Promise.resolve(ping))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of clusters requests
    await flushPromises()
    // assert ping not retrieved
    expect(mockGatewayAPI.ping).not.toBeCalled()
    // Check Slurm version is absent
    expect(wrapper.find('span span').exists()).toBeFalsy()
    // Check absence of cluster stats component
    expect(wrapper.findComponent(ClusterStats).exists()).toBeFalsy()
    // Check cluster status is denied
    expect(wrapper.get('div div p').text()).toBe('Denied')
  })
  test('cluster without view-stats permission', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-jobs']
    mockGatewayAPI.ping.mockReturnValueOnce(Promise.resolve(ping))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    await flushPromises()
    // assert ping have been retrieved
    expect(mockGatewayAPI.ping).toBeCalled()
    // Check presence of Slurm version
    expect(wrapper.get('span span').text()).toContain('Slurm ')
    // Check absence of cluster stats component
    expect(wrapper.findComponent(ClusterStats).exists()).toBeFalsy()
    // Check cluster status is available
    expect(wrapper.get('div div p').text()).toBe('Available')
  })
  test('authentication error', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.ping.mockImplementationOnce(() => {
      throw new AuthenticationError('fake authentication error')
    })
    shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of ping requests
    await flushPromises()
    // Check that returnUrl was set to current route
    expect(useAuthStore().returnUrl).toBe('/clusters')
  })
})
