import { describe, test, beforeEach, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { init_plugins, getMockClusterDataPoller } from '../../views/common'
import ChartJobsHistogram from '@/components/dashboard/ChartJobsHistogram.vue'
import metricsJobsHour from '../../assets/metrics-jobs-hour.json'
import type { MetricJobState, MetricValue } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'

const mockClusterDataPoller = getMockClusterDataPoller<Record<MetricJobState, MetricValue[]>>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ChartJobsHistogram.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('should display jobs charts histogram', async () => {
    const wrapper = mount(ChartJobsHistogram)
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
    mockClusterDataPoller.data.value = metricsJobsHour as Record<MetricJobState, MetricValue[]>
    mockClusterDataPoller.loaded.value = true
    await flushPromises()

    // Check placeholder is now hidden and chart visible now that data is loaded
    expect(placeholder.attributes('style')).toContain('display: none;')
    expect(canvas.attributes('style')).not.toContain('display: none;')
  })
  test('should display error when unable to load data', async () => {
    const wrapper = mount(ChartJobsHistogram)
    mockClusterDataPoller.unable.value = true
    await flushPromises()
    // Check error message
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve jobs metrics.')
    // Chart chart and placeholder are present in DOM
    expect(wrapper.find({ ref: 'chartCanvas' }).exists()).toBeFalsy()
    expect(wrapper.find('img[alt="Loading chart"]').exists()).toBeFalsy()
  })
})
