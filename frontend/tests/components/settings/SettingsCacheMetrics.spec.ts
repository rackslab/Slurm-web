import { describe, test, beforeEach, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import type { MetricCacheResult, MetricValue } from '@/composables/GatewayAPI'
import SettingsCacheMetrics from '@/components/settings/SettingsCacheMetrics.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import metricsCacheHour from '../../assets/metrics-cache-hour.json'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'

const mockClusterDataPoller = getMockClusterDataPoller<Record<MetricCacheResult, MetricValue[]>>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('SettingsCacheMetrics.vue', () => {
  beforeEach(() => {
    init_plugins()
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
  test('should display cache metrics histogram', async () => {
    const wrapper = mount(SettingsCacheMetrics, {
      props: {
        cluster: useRuntimeStore().availableClusters[0]
      }
    })
    const placeholder = wrapper.get('img[alt="Loading chart"]')
    const canvas = wrapper.get({ ref: 'chartCanvas' })

    // Start with unloaded data
    mockClusterDataPoller.loaded.value = false
    await flushPromises()

    // Check placeholder is visible and chart hidden while data is not loaded
    // Note that isVisible() does not work in this case, for unknown reason.
    expect(placeholder.attributes('style')).not.toContain('display: none;')
    expect(canvas.attributes('style')).toContain('display: none;')

    // now load data
    mockClusterDataPoller.data.value = metricsCacheHour as Record<MetricCacheResult, MetricValue[]>
    mockClusterDataPoller.loaded.value = true
    await flushPromises()

    // Check placeholder is now hidden and chart visible now that data is loaded
    expect(placeholder.attributes('style')).toContain('display: none;')
    expect(canvas.attributes('style')).not.toContain('display: none;')
  })
  test('should display error when unable to load data', async () => {
    mockClusterDataPoller.unable.value = true
    mockClusterDataPoller.loaded.value = false
    const wrapper = mount(SettingsCacheMetrics, {
      props: {
        cluster: useRuntimeStore().availableClusters[0]
      }
    })
    await flushPromises()
    // Check error message
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve cache metrics.')
    // Check chart and placeholder are not present in DOM
    expect(wrapper.find({ ref: 'chartCanvas' }).exists()).toBeFalsy()
    expect(wrapper.find('img[alt="Loading chart"]').exists()).toBeFalsy()
  })
  test('range button changes should change datapoller callback param', async () => {
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(SettingsCacheMetrics, {
      props: {
        cluster: useRuntimeStore().availableClusters[0]
      }
    })
    mockClusterDataPoller.data.value = metricsCacheHour as Record<MetricCacheResult, MetricValue[]>
    await wrapper.get('button#range-week').trigger('click')
    await flushPromises()
    expect(mockClusterDataPoller.setParam).toHaveBeenCalledWith('week')
    await wrapper.get('button#range-day').trigger('click')
    await flushPromises()
    expect(mockClusterDataPoller.setParam).toHaveBeenCalledWith('day')
    await wrapper.get('button#range-hour').trigger('click')
    await flushPromises()
    expect(mockClusterDataPoller.setParam).toHaveBeenCalledWith('hour')
  })
})
