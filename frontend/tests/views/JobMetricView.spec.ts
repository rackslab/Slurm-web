import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import JobMetricView from '@/views/JobMetricView.vue'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import jobRunning from '../assets/job-running.json'
import jobGpusRunning from '../assets/job-gpus-running.json'
import jobMetrics from '../assets/job-metrics.json'
import jobMetricsDetail from '../assets/job-metrics-detail.json'
import JobMetricSettingsPane from '@/components/job/JobMetricSettingsPane.vue'
import type { JobMetric, JobMetrics, JobMetricsDetail } from '@/composables/gateway/types/metrics'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

const mockJobDataPoller = getMockClusterDataPoller<SlurmJobDetail>()
const mockMetricsDataPoller = getMockClusterDataPoller<JobMetrics | JobMetricsDetail>()

const useClusterDataPoller = vi.hoisted(() => vi.fn())
vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller
}))

const ALL_METRICS: JobMetric[] = ['cpu', 'memory', 'memory_allocated', 'gpu', 'gpu_memory']

let router: RouterMock

function setClusterJobMetrics(metrics: JobMetric[]) {
  useRuntimeStore().availableClusters = [
    {
      name: 'foo',
      permissions: { roles: [], actions: [] },
      racksdb: true,
      infrastructure: 'foo',
      metrics: true,
      job_metrics: metrics,
      cache: true,
      slurmdbd: { jobs_max_hours: 168 }
    }
  ]
}

function mountView(metric: string, job: unknown = jobGpusRunning) {
  mockJobDataPoller.data.value = job as SlurmJobDetail
  return mount(JobMetricView, {
    props: { cluster: 'foo', id: 1234, metric },
    global: {
      stubs: {
        // Headless UI stubs for settings drawer
        teleport: true,
        Dialog: { template: '<div v-bind="$attrs"><slot /></div>' },
        DialogPanel: { template: '<div v-bind="$attrs"><slot /></div>' },
        TransitionRoot: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
        TransitionChild: { template: '<div><slot /></div>' }
      }
    }
  })
}

describe('JobMetricView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    setClusterJobMetrics(ALL_METRICS)
    useClusterDataPoller.mockImplementation((cluster: string, callback: string) =>
      callback === 'job' ? mockJobDataPoller : mockMetricsDataPoller
    )
    mockJobDataPoller.loaded.value = true
    mockJobDataPoller.unable.value = false
    mockMetricsDataPoller.data.value = jobMetrics
    mockMetricsDataPoller.loaded.value = true
    mockMetricsDataPoller.unable.value = false
  })
  test('display chart of metric in fullscreen', () => {
    const wrapper = mountView('memory')
    expect(wrapper.get('h3').text()).toBe('Job 1234 · Memory usage')
    const chart = wrapper.getComponent(JobMetricChart)
    expect(chart.props('fullscreen')).toBe(true)
    expect(chart.props('unit')).toBe('bytes')
    expect(chart.props('series').map((serie) => serie.values)).toEqual([
      jobMetrics.memory,
      jobMetrics.memory_allocated
    ])
    expect(chart.props('range').min).toBe(jobGpusRunning.time.start * 1000)
    expect(router.replace).not.toHaveBeenCalled()
  })
  test('navigation with resource and kind of usage groups', () => {
    const wrapper = mountView('memory')
    const groups = wrapper.get('[data-testid="job-metric-navigation"]').findAll('span')
    expect(groups.map((group) => group.findAll('button').map((button) => button.text()))).toEqual([
      ['CPU', 'GPU'],
      ['Usage', 'Memory']
    ])
    // Memory chart is CPU resource and memory kind.
    expect(wrapper.get('[data-testid="job-metric-nav-cpu"]').classes()).toContain('bg-slurmweb')
    expect(wrapper.get('[data-testid="job-metric-nav-gpu"]').classes()).not.toContain('bg-slurmweb')
    expect(wrapper.get('[data-testid="job-metric-nav-usage"]').classes()).not.toContain(
      'bg-slurmweb'
    )
    expect(wrapper.get('[data-testid="job-metric-nav-memory"]').classes()).toContain('bg-slurmweb')
  })
  test('switch resource keeping kind of usage', async () => {
    const wrapper = mountView('memory')
    await wrapper.get('[data-testid="job-metric-nav-gpu"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'gpu-memory' },
      query: {}
    })
  })
  test('switch kind of usage keeping resource', async () => {
    const wrapper = mountView('gpu-memory')
    await wrapper.get('[data-testid="job-metric-nav-usage"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'gpu' },
      query: {}
    })
  })
  test('no navigation to current chart', async () => {
    const wrapper = mountView('cpu')
    await wrapper.get('[data-testid="job-metric-nav-cpu"]').trigger('click')
    await wrapper.get('[data-testid="job-metric-nav-usage"]').trigger('click')
    expect(router.push).not.toHaveBeenCalled()
  })
  test('GPU disabled for job without GPU', async () => {
    const wrapper = mountView('cpu', jobRunning)
    const gpu = wrapper.get('[data-testid="job-metric-nav-gpu"]')
    expect(gpu.attributes('disabled')).toBeDefined()
    expect(gpu.classes()).toContain('cursor-not-allowed')
    expect(wrapper.get('[data-testid="job-metric-nav-memory"]').attributes('disabled')).toBe(
      undefined
    )
    await gpu.trigger('click')
    expect(router.push).not.toHaveBeenCalled()
  })
  test('memory disabled without memory metric on cluster', () => {
    setClusterJobMetrics(['cpu', 'gpu'])
    const wrapper = mountView('gpu')
    expect(
      wrapper.get('[data-testid="job-metric-nav-memory"]').attributes('disabled')
    ).toBeDefined()
    expect(wrapper.get('[data-testid="job-metric-nav-cpu"]').attributes('disabled')).toBe(undefined)
  })
  test('navigation centered between title and close button', () => {
    const wrapper = mountView('cpu')
    const header = wrapper.get('[data-testid="job-metric-navigation"]').element.parentElement
    // Side columns of the grid have the same width.
    expect(header?.classList).toContain('grid-cols-[1fr_auto_1fr]')
    expect(wrapper.get('h3').classes()).toContain('truncate')
  })
  test('no navigation with only one chart', () => {
    setClusterJobMetrics(['cpu'])
    const wrapper = mountView('cpu')
    expect(wrapper.find('[data-testid="job-metric-navigation"]').exists()).toBe(false)
  })
  test('close fullscreen view', async () => {
    const wrapper = mountView('cpu')
    await wrapper.get('[data-testid="job-metric-close"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'job',
      params: { cluster: 'foo', id: 1234 }
    })
  })
  test('redirect to job with unknown metric', () => {
    mountView('fail')
    expect(router.replace).toHaveBeenCalledWith({
      name: 'job',
      params: { cluster: 'foo', id: 1234 }
    })
  })
  test('redirect to job with GPU metric of job without GPU', () => {
    mountView('gpu', jobRunning)
    expect(router.replace).toHaveBeenCalledWith({
      name: 'job',
      params: { cluster: 'foo', id: 1234 }
    })
  })
  test('redirect to job without jobs metrics on cluster', () => {
    setClusterJobMetrics([])
    mountView('cpu')
    expect(router.replace).toHaveBeenCalledWith({
      name: 'job',
      params: { cluster: 'foo', id: 1234 }
    })
  })
  test('wait for job before redirecting', async () => {
    mockJobDataPoller.loaded.value = false
    const wrapper = mountView('gpu', undefined)
    expect(router.replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Loading job 1234')
    // Job with GPU is loaded, the chart is displayed.
    mockJobDataPoller.data.value = jobGpusRunning as SlurmJobDetail
    mockJobDataPoller.loaded.value = true
    await nextTick()
    expect(router.replace).not.toHaveBeenCalled()
    expect(wrapper.getComponent(JobMetricChart).props('title')).toBe('GPU usage')
  })
  test('display error when unable to retrieve job', () => {
    mockJobDataPoller.unable.value = true
    const wrapper = mountView('cpu')
    expect(wrapper.getComponent(ErrorAlert).text()).toBe(
      'Unable to retrieve job 1234 from cluster foo'
    )
    expect(wrapper.findComponent(JobMetricChart).exists()).toBe(false)
  })
  test('display error when unable to retrieve metrics', () => {
    mockMetricsDataPoller.unable.value = true
    const wrapper = mountView('cpu')
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve job metrics.')
    expect(wrapper.findComponent(JobMetricChart).exists()).toBe(false)
  })
  test('poll aggregated metrics of whole job by default', () => {
    mountView('cpu')
    expect(useClusterDataPoller).toHaveBeenCalledWith('foo', 'job_metrics_query', 30000, {
      job: 1234,
      detail: undefined,
      start: undefined,
      end: undefined
    })
    expect(mockMetricsDataPoller.setParam).not.toHaveBeenCalled()
  })
  test('read settings from route query', () => {
    router.setQuery({ view: 'detail', series: 'gpu2.nova', start: '1800000000', end: 'fail' })
    mockMetricsDataPoller.data.value = jobMetricsDetail
    const wrapper = mountView('memory')
    expect(useClusterDataPoller).toHaveBeenCalledWith('foo', 'job_metrics_query', 30000, {
      job: 1234,
      detail: true,
      start: 1800000000,
      end: undefined
    })
    const pane = wrapper.getComponent(JobMetricSettingsPane)
    expect(pane.props('detail')).toBe(true)
    expect(pane.props('selection')).toEqual(['gpu2.nova'])
    expect(pane.props('start')).toBe(1800000000)
    expect(pane.props('end')).toBeUndefined()
    expect(pane.props('resource')).toBe('cpu')
    expect(pane.props('items')).toEqual([
      { id: 'gpu1.nova', label: 'gpu1.nova' },
      { id: 'gpu2.nova', label: 'gpu2.nova' }
    ])
  })
  test('display detailed series of selected nodes with allocated memory', () => {
    router.setQuery({ view: 'detail', series: 'gpu2.nova' })
    mockMetricsDataPoller.data.value = jobMetricsDetail
    const wrapper = mountView('memory')
    const series = wrapper.getComponent(JobMetricChart).props('series')
    expect(series.map((serie) => serie.label)).toEqual(['gpu2.nova', 'gpu2.nova allocated'])
    expect(series[1].dashed).toBe(true)
    // Node keeps its color whatever the selection, allocated memory has the same color.
    expect(series[0].color).toBe(series[1].color)
    expect(series[0].values).toEqual(jobMetricsDetail.memory[1].values)
    expect(series[1].values).toEqual(jobMetricsDetail.memory_allocated[1].values)
  })
  test('display detailed series of all GPUs', () => {
    router.setQuery({ view: 'detail' })
    mockMetricsDataPoller.data.value = jobMetricsDetail
    const wrapper = mountView('gpu')
    const series = wrapper.getComponent(JobMetricChart).props('series')
    expect(series.map((serie) => serie.label)).toEqual(['gpu1.nova · GPU 0', 'gpu2.nova · GPU 0'])
    expect(series[0].color).not.toBe(series[1].color)
    expect(wrapper.getComponent(JobMetricSettingsPane).props('items')).toEqual([
      { id: 'gpu1.nova/0', label: 'gpu1.nova · GPU 0' },
      { id: 'gpu2.nova/0', label: 'gpu2.nova · GPU 0' }
    ])
  })
  test('no aggregated values while detailed series are loaded', () => {
    // Detailed series are still loaded after switching back to job view.
    mockMetricsDataPoller.data.value = jobMetricsDetail
    const wrapper = mountView('cpu')
    expect(wrapper.getComponent(JobMetricChart).props('series')[0].values).toEqual([])
  })
  test('restrict range to time range of settings', () => {
    const start = jobGpusRunning.time.start + 60
    router.setQuery({ start: start.toString() })
    const wrapper = mountView('cpu')
    expect(wrapper.getComponent(JobMetricChart).props('range').min).toBe(start * 1000)
  })
  test('update route query with settings', async () => {
    router.setQuery({ start: '1800000000' })
    const wrapper = mountView('cpu')
    const pane = wrapper.getComponent(JobMetricSettingsPane)
    pane.vm.$emit('update:detail', true)
    expect(router.replace).toHaveBeenLastCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'cpu' },
      query: { view: 'detail', start: '1800000000' }
    })
    pane.vm.$emit('update:end', 1800000600)
    expect(router.replace).toHaveBeenLastCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'cpu' },
      query: { start: '1800000000', end: '1800000600' }
    })
  })
  test('update route query with selection in detail view', async () => {
    router.setQuery({ view: 'detail' })
    const wrapper = mountView('cpu')
    wrapper.getComponent(JobMetricSettingsPane).vm.$emit('update:selection', ['cn1', 'cn2'])
    expect(router.replace).toHaveBeenLastCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'cpu' },
      query: { view: 'detail', series: 'cn1,cn2' }
    })
  })
  test('keep settings when switching kind of usage', async () => {
    router.setQuery({ view: 'detail', series: 'gpu1.nova', start: '1800000000' })
    const wrapper = mountView('cpu')
    await wrapper.get('[data-testid="job-metric-nav-memory"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'memory' },
      query: { view: 'detail', series: 'gpu1.nova', start: '1800000000' }
    })
  })
  test('drop selection when switching resource', async () => {
    router.setQuery({ view: 'detail', series: 'gpu1.nova', end: '1800000000' })
    const wrapper = mountView('cpu')
    await wrapper.get('[data-testid="job-metric-nav-gpu"]').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      name: 'job-metric',
      params: { cluster: 'foo', id: 1234, metric: 'gpu' },
      query: { view: 'detail', end: '1800000000' }
    })
  })
  test('open settings drawer', async () => {
    const wrapper = mountView('cpu')
    const pane = wrapper.getComponent(JobMetricSettingsPane)
    // Drawer is closed by default, chart has full width.
    expect(pane.props('open')).toBe(false)
    await wrapper.get('[data-testid="job-metric-settings-open"]').trigger('click')
    expect(pane.props('open')).toBe(true)
    pane.vm.$emit('update:open', false)
    await nextTick()
    expect(pane.props('open')).toBe(false)
    expect(wrapper.find('[data-testid="job-metric-settings-open"]').exists()).toBe(true)
  })
})
