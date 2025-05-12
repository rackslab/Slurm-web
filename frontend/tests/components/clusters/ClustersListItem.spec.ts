import { describe, test, expect, beforeEach, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ClusterListItem from '@/components/clusters/ClustersListItem.vue'
import stats from '../../assets/stats.json'
import { init_plugins } from '../../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import { APIServerError } from '@/composables/HTTPErrors'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const mockGatewayAPI = {
  stats: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

let router

describe('ClustersListItem.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true
      }
    ]
    mockGatewayAPI.stats.mockReset()
  })
  test('cluster with permission', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.stats.mockReturnValueOnce(Promise.resolve(stats))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of clusters requests
    await flushPromises()
    // assert stats have been retrieved
    expect(mockGatewayAPI.stats).toBeCalled()
    // Check presence of Slurm version
    expect(wrapper.get('span span').text()).toContain('Slurm ')
    // Check presence of nodes/jobs stats
    const statsElements = wrapper.findAll('p')
    expect(statsElements[0].text()).toContain('nodes')
    expect(statsElements[1].text()).toContain('job')
    // Check cluster status is available
    expect(wrapper.get('div div p').text()).toBe('Available')
    // Check error flag is false
    expect(useRuntimeStore().getCluster('foo').error).toBeFalsy()
  })
  test('cluster error', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.stats.mockImplementationOnce(() => {
      throw new APIServerError(500, 'fake error')
    })
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of clusters requests
    await flushPromises()
    // assert stats have been retrieved
    expect(mockGatewayAPI.stats).toBeCalled()
    // Check Slurm version is absent
    expect(wrapper.find('span span').exists()).toBeFalsy()
    // Check there is only one paragraph for cluster status, not for stats
    expect(wrapper.findAll('p').length).toBe(1)
    // Check cluster status informs about ongoing issue
    expect(wrapper.get('div div p').text()).toBe('Ongoing issue')
    // Check error flag is true
    expect(useRuntimeStore().getCluster('foo').error).toBeTruthy()
  })
  test('cluster loading', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-stats', 'view-jobs']
    mockGatewayAPI.stats.mockReturnValueOnce(Promise.resolve(stats))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // assert stats are being retrieved
    expect(mockGatewayAPI.stats).toBeCalled()
    // Check presence of loading spinner
    expect(wrapper.findComponent(LoadingSpinner).exists()).toBeTruthy()
    // Check cluster status is loading
    expect(wrapper.get('div div p').text()).toBe('Loading')
  })
  test('cluster without permission', async () => {
    mockGatewayAPI.stats.mockReturnValueOnce(Promise.resolve(stats))
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    // Wait for result of clusters requests
    await flushPromises()
    // assert stats not retrieved
    expect(mockGatewayAPI.stats).not.toBeCalled()
    // Check Slurm version is absent
    expect(wrapper.find('span span').exists()).toBeFalsy()
    // Check there is only one paragraph for cluster status, not for stats
    expect(wrapper.findAll('p').length).toBe(1)
    expect(wrapper.get('div div p').text()).toBe('Denied')
  })
  test('cluster without view-stats permission', async () => {
    useRuntimeStore().availableClusters[0].permissions.actions = ['view-jobs']
    const wrapper = shallowMount(ClusterListItem, {
      props: {
        clusterName: useRuntimeStore().availableClusters[0].name
      }
    })
    await flushPromises()
    // assert stats not retrieved
    expect(mockGatewayAPI.stats).not.toBeCalled()
    // Check Slurm version is absent
    expect(wrapper.find('span span').exists()).toBeFalsy()
    // Check there is only one paragraph for cluster status, not for stats
    expect(wrapper.findAll('p').length).toBe(1)
    expect(wrapper.get('div div p').text()).toBe('Available')
  })
})
