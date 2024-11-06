import { describe, test, beforeEach, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins, getMockClusterDataPoller } from '../../views/common'
import ChartResourcesHistogram from '@/components/dashboard/ChartResourcesHistogram.vue'
import metricsNodesHour from '../../assets/metrics-nodes-hour.json'
import type { MetricResourceState, MetricValue } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'

const mockClusterDataPoller = getMockClusterDataPoller<Record<MetricResourceState, MetricValue[]>>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

let router

describe('ChartJobsHistogram.vue', () => {
  beforeEach(() => {
    router = init_plugins()
  })
  test('should display resources charts histogram', async () => {
    const wrapper = mount(ChartResourcesHistogram)
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
    mockClusterDataPoller.data.value = metricsNodesHour as Record<
      MetricResourceState,
      MetricValue[]
    >

    mockClusterDataPoller.loaded.value = true
    await flushPromises()

    // Check placeholder is now hidden and chart visible now that data is loaded
    expect(placeholder.attributes('style')).toContain('display: none;')
    expect(canvas.attributes('style')).not.toContain('display: none;')
  })
  test('should display error when unable to load data', async () => {
    const wrapper = mount(ChartResourcesHistogram)
    mockClusterDataPoller.unable.value = true
    await flushPromises()
    // Check error message
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve resource metrics.')
    // Chart chart and placeholder are present in DOM
    expect(wrapper.find({ ref: 'chartCanvas' }).exists()).toBeFalsy()
    expect(wrapper.find('img[alt="Loading chart"]').exists()).toBeFalsy()
  })
  test('cores toggle changes should change datapoller callback with route query update', async () => {
    const wrapper = mount(ChartResourcesHistogram)
    mockClusterDataPoller.data.value = metricsNodesHour as Record<
      MetricResourceState,
      MetricValue[]
    >
    useRuntimeStore().dashboard.coresToggle = true
    await flushPromises()
    expect(mockClusterDataPoller.setCallback).toHaveBeenCalledWith('metrics_cores')
    expect(router.push).toHaveBeenCalledWith({
      name: 'dashboard',
      query: {
        cores: true
      }
    })
    useRuntimeStore().dashboard.coresToggle = false
    await flushPromises()
    expect(mockClusterDataPoller.setCallback).toHaveBeenCalledWith('metrics_nodes')
    expect(router.push).toHaveBeenCalledWith({
      name: 'dashboard',
      query: {}
    })
  })
})
