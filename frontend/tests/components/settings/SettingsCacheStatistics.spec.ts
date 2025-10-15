import { describe, test, beforeEach, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import type { CacheStatistics } from '@/composables/GatewayAPI'
import SettingsCacheStatistics from '@/components/settings/SettingsCacheStatistics.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import cacheStats from '../../assets/cache-stats.json'

const mockClusterDataPoller = getMockClusterDataPoller<CacheStatistics>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

const mockGatewayAPI = {
  cache_reset: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

describe('SettingsCacheStatistics.vue', () => {
  beforeEach(() => {
    init_plugins()
    mockGatewayAPI.cache_reset.mockClear()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: ['cache-view'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true
      }
    ]
  })
  test('should display cluster cache statistics', () => {
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = cacheStats
    const wrapper = mount(SettingsCacheStatistics, {
      props: {
        cluster: useRuntimeStore().availableClusters[0]
      }
    })
    // Check columns of statistics table
    expect(wrapper.findAll('th').map((element) => element.text())).toStrictEqual([
      'Name',
      'Hit',
      'Miss',
      'Total',
      'Hit rate'
    ])
    // Check rows first column
    expect(
      wrapper.findAll('tbody tr td:first-child').map((element) => element.text())
    ).toStrictEqual(Object.keys(cacheStats.miss.keys).concat(['Total']))
    // Check total line
    expect(
      wrapper.findAll('tbody tr:last-child td').map((element) => element.text())
    ).toStrictEqual([
      'Total',
      cacheStats.hit.total.toString(),
      cacheStats.miss.total.toString(),
      (cacheStats.hit.total + cacheStats.miss.total).toString(),
      ((cacheStats.hit.total / (cacheStats.miss.total + cacheStats.hit.total)) * 100).toFixed(2) +
        '%'
    ])
  })
  test('should report error when unable to retrieve statistics', () => {
    mockClusterDataPoller.unable.value = true
    mockClusterDataPoller.loaded.value = false
    const wrapper = mount(SettingsCacheStatistics, {
      props: {
        cluster: useRuntimeStore().availableClusters[0]
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve cache statistics.')
    expect(wrapper.find('table').exists()).toBeFalsy()
  })
  test('should indicate when loading data', () => {
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = false
    const wrapper = mount(SettingsCacheStatistics, {
      props: {
        cluster: useRuntimeStore().availableClusters[0]
      }
    })
    expect(wrapper.findComponent(LoadingSpinner).exists()).toBeTruthy()
    expect(wrapper.find('div').text()).toBe('Loading statistics…')
    expect(wrapper.find('table').exists()).toBeFalsy()
  })

  test('should not show reset button when user lacks cache-reset permission', () => {
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = cacheStats

    const clusterWithoutResetPermission = {
      name: 'foo',
      permissions: { roles: [], actions: ['cache-view'] },
      racksdb: true,
      infrastructure: 'foo',
      metrics: true,
      cache: true
    }

    const wrapper = mount(SettingsCacheStatistics, {
      props: {
        cluster: clusterWithoutResetPermission
      }
    })

    expect(wrapper.find('button').exists()).toBeFalsy()
  })

  test('should show reset button when user has cache-reset permission', () => {
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = cacheStats

    const clusterWithResetPermission = {
      name: 'foo',
      permissions: { roles: [], actions: ['cache-view', 'cache-reset'] },
      racksdb: true,
      infrastructure: 'foo',
      metrics: true,
      cache: true
    }

    const wrapper = mount(SettingsCacheStatistics, {
      props: {
        cluster: clusterWithResetPermission
      }
    })

    const resetButton = wrapper.find('button')
    expect(resetButton.exists()).toBeTruthy()
    expect(resetButton.text()).toBe('Reset statistics')
    expect(resetButton.find('svg').exists()).toBeTruthy() // ArrowPathIcon
  })

  test('should call cache_reset and update data when reset button is clicked', async () => {
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = cacheStats

    const resetResponse = {
      hit: { keys: {}, total: 0 },
      miss: { keys: {}, total: 0 }
    }
    mockGatewayAPI.cache_reset.mockResolvedValue(resetResponse)

    const clusterWithResetPermission = {
      name: 'foo',
      permissions: { roles: [], actions: ['cache-view', 'cache-reset'] },
      racksdb: true,
      infrastructure: 'foo',
      metrics: true,
      cache: true
    }

    const wrapper = mount(SettingsCacheStatistics, {
      props: {
        cluster: clusterWithResetPermission
      }
    })

    const resetButton = wrapper.find('button')
    await resetButton.trigger('click')

    expect(mockGatewayAPI.cache_reset).toHaveBeenCalledWith('foo')
    expect(mockClusterDataPoller.data.value).toEqual(resetResponse)
  })
})
