import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RouterMock } from 'vue-router-mock'
import { init_plugins } from '../../lib/common'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import type { JobMetricSeries } from '@/composables/charts/JobMetricLine'

const series: JobMetricSeries[] = [
  {
    label: 'CPU',
    color: 'rgba(59, 130, 246, 1)',
    values: [
      [1000000, 50],
      [1015000, 75]
    ]
  }
]
const fullscreenRoute = {
  name: 'job-metric',
  params: { cluster: 'foo', id: 1234, metric: 'cpu' }
}

let router: RouterMock

function mountChart(props: Record<string, unknown> = {}) {
  return mount(JobMetricChart, {
    props: {
      title: 'CPU usage',
      unit: 'percent',
      series: series,
      range: { min: 1000000, max: 1015000 },
      loaded: true,
      ...props
    }
  })
}

function isHidden(style: string | undefined): boolean {
  return (style ?? '').includes('display: none;')
}

describe('JobMetricChart.vue', () => {
  beforeEach(() => {
    router = init_plugins()
  })
  test('display title and chart in card', () => {
    const wrapper = mountChart()
    expect(wrapper.get('h4').text()).toBe('CPU usage')
    expect(wrapper.classes()).toContain('border')
    expect(wrapper.get('canvas').element.parentElement?.classList).toContain('h-56')
  })
  test('display fullscreen button on hover', async () => {
    const wrapper = mountChart({ fullscreenRoute })
    const button = wrapper.get('[data-testid="job-metric-fullscreen"]')
    expect(isHidden(button.attributes('style'))).toBe(true)
    await wrapper.trigger('mouseover')
    expect(isHidden(button.attributes('style'))).toBe(false)
    await wrapper.trigger('mouseleave')
    expect(isHidden(button.attributes('style'))).toBe(true)
  })
  test('open fullscreen view on click', async () => {
    const wrapper = mountChart({ fullscreenRoute })
    await wrapper.trigger('mouseover')
    await wrapper.get('[data-testid="job-metric-fullscreen"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith(fullscreenRoute)
  })
  test('no fullscreen button without route', async () => {
    const wrapper = mountChart()
    await wrapper.trigger('mouseover')
    expect(isHidden(wrapper.get('[data-testid="job-metric-fullscreen"]').attributes('style'))).toBe(
      true
    )
  })
  test('no fullscreen button while loading', async () => {
    const wrapper = mountChart({ fullscreenRoute, loaded: false })
    await wrapper.trigger('mouseover')
    expect(isHidden(wrapper.get('[data-testid="job-metric-fullscreen"]').attributes('style'))).toBe(
      true
    )
  })
  test('no fullscreen button without data', async () => {
    const wrapper = mountChart({
      fullscreenRoute,
      series: [{ label: 'CPU', color: 'rgba(59, 130, 246, 1)', values: [] }]
    })
    await wrapper.trigger('mouseover')
    expect(isHidden(wrapper.get('[data-testid="job-metric-fullscreen"]').attributes('style'))).toBe(
      true
    )
  })
  test('fill available space in fullscreen view', () => {
    const wrapper = mountChart({ fullscreen: true })
    // Title is displayed in fullscreen view header, without card border.
    expect(wrapper.find('h4').exists()).toBe(false)
    expect(wrapper.find('[data-testid="job-metric-fullscreen"]').exists()).toBe(false)
    expect(wrapper.classes()).not.toContain('border')
    expect(wrapper.classes()).toContain('flex-1')
    const container = wrapper.get('canvas').element.parentElement
    expect(container?.classList).toContain('flex-1')
    expect(container?.classList).not.toContain('h-56')
  })
})
