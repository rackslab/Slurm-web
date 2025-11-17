import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ClusterStats from '@/components/clusters/ClusterStats.vue'
import stats from '../../assets/stats.json'
import { init_plugins } from '../../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import { AuthenticationError } from '@/composables/HTTPErrors'

const mockGatewayAPI = {
  stats: vi.fn()
}

const mockErrorsHandler = {
  reportAuthenticationError: vi.fn(),
  reportServerError: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

vi.mock('@/composables/ErrorsHandler', () => ({
  useErrorsHandler: () => mockErrorsHandler
}))

describe('ClusterStats.vue', () => {
  beforeEach(() => {
    init_plugins()
    const runtimeStore = useRuntimeStore()
    runtimeStore.availableClusters = [
      {
        name: 'foo',
        racksdb: false,
        infrastructure: 'on-prem',
        metrics: true,
        cache: true,
        permissions: { roles: [], actions: [] }
      }
    ]
    mockGatewayAPI.stats.mockReset()
    mockErrorsHandler.reportAuthenticationError.mockReset()
    mockErrorsHandler.reportServerError.mockReset()
  })

  test('shows loading spinner while stats are being fetched', () => {
    mockGatewayAPI.stats.mockReturnValue(new Promise(() => {}))
    const wrapper = shallowMount(ClusterStats, {
      props: { clusterName: 'foo' }
    })
    expect(mockGatewayAPI.stats).toHaveBeenCalledWith('foo')
    // Check presence of loading spinner
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
    // Check absence of stats information
    expect(wrapper.find('span.text-center').exists()).toBe(false)
  })

  test('displays stats information once loaded', async () => {
    mockGatewayAPI.stats.mockResolvedValueOnce(stats)
    const wrapper = shallowMount(ClusterStats, {
      props: { clusterName: 'foo' }
    })

    await flushPromises()

    // Check presence of stats information
    const infoText = wrapper.text()
    expect(infoText).toContain(' nodes')
    expect(infoText).toContain(' job')
    // Check stats information is stored in runtime store
    expect(useRuntimeStore().getCluster('foo').stats).toEqual(stats)
    // Check absence of loading spinner
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
  })

  test('reports authentication error when stats request fails with auth error', async () => {
    const error = new AuthenticationError('unauthorized')
    mockGatewayAPI.stats.mockRejectedValueOnce(error)
    const wrapper = shallowMount(ClusterStats, {
      props: { clusterName: 'foo' }
    })

    await flushPromises()

    // Check authentication error is reported
    expect(mockErrorsHandler.reportAuthenticationError).toHaveBeenCalledWith(error)
    // Check server error is not reported
    expect(mockErrorsHandler.reportServerError).not.toHaveBeenCalled()
    // Check absence of loading spinner
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
    // Check absence of stats information
    expect(wrapper.find('span.text-center').exists()).toBe(false)
  })

  test('reports server error for unexpected failures', async () => {
    const error = new Error('unexpected')
    mockGatewayAPI.stats.mockRejectedValueOnce(error)
    const wrapper = shallowMount(ClusterStats, {
      props: { clusterName: 'foo' }
    })

    await flushPromises()

    // Check server error is reported
    expect(mockErrorsHandler.reportServerError).toHaveBeenCalledWith(error)
    // Check authentication error is not reported
    expect(mockErrorsHandler.reportAuthenticationError).not.toHaveBeenCalled()
    // Check absence of loading spinner
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
    expect(wrapper.find('span.text-center').exists()).toBe(false)
    // Check absence of stats information
    expect(wrapper.find('span.text-center').exists()).toBe(false)
  })
})
