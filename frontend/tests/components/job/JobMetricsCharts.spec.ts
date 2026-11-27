import { describe, test, beforeEach, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import JobMetricsCharts from '@/components/job/JobMetricsCharts.vue'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import jobRunning from '../../assets/job-running.json'
import jobGpusRunning from '../../assets/job-gpus-running.json'
import jobMetrics from '../../assets/job-metrics.json'
import type { JobMetric, JobMetrics } from '@/composables/gateway/types/metrics'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<JobMetrics>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

const ALL_METRICS: JobMetric[] = ['cpu', 'memory', 'memory_allocated', 'gpu', 'gpu_memory']

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

function mountCharts(job: unknown) {
  return mount(JobMetricsCharts, {
    props: { cluster: 'foo', id: 1234, job: job as SlurmJobDetail }
  })
}

describe('JobMetricsCharts.vue', () => {
  beforeEach(() => {
    init_plugins()
    setClusterJobMetrics(ALL_METRICS)
    mockClusterDataPoller.data.value = jobMetrics
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.unable.value = false
    vi.mocked(mockClusterDataPoller.pause).mockClear()
  })
  test('display all charts for job with GPU', () => {
    const wrapper = mountCharts(jobGpusRunning)
    const charts = wrapper.findAllComponents(JobMetricChart)
    expect(charts.map((chart) => chart.props('title'))).toEqual([
      'CPU usage',
      'Memory usage',
      'GPU usage',
      'GPU memory usage'
    ])
    // CPU chart has one series with values from metrics
    expect(charts[0].props('unit')).toBe('percent')
    expect(charts[0].props('series')).toHaveLength(1)
    expect(charts[0].props('series')[0].values).toEqual(jobMetrics.cpu)
    // Memory chart has used and allocated series
    expect(charts[1].props('unit')).toBe('bytes')
    const memorySeries = charts[1].props('series')
    expect(memorySeries.map((serie) => serie.label)).toEqual(['Used', 'Allocated'])
    expect(memorySeries[0].values).toEqual(jobMetrics.memory)
    expect(memorySeries[1].values).toEqual(jobMetrics.memory_allocated)
    expect(memorySeries[1].dashed).toBe(true)
    // x-axis starts at job start time
    expect(charts[0].props('range').min).toBe(jobGpusRunning.time.start * 1000)
  })
  test('hide GPU charts for job without GPU', () => {
    const wrapper = mountCharts(jobRunning)
    const charts = wrapper.findAllComponents(JobMetricChart)
    expect(charts.map((chart) => chart.props('title'))).toEqual(['CPU usage', 'Memory usage'])
  })
  test('display only metrics available on cluster', () => {
    setClusterJobMetrics(['memory', 'gpu'])
    const wrapper = mountCharts(jobGpusRunning)
    const charts = wrapper.findAllComponents(JobMetricChart)
    expect(charts.map((chart) => chart.props('title'))).toEqual(['Memory usage', 'GPU usage'])
    // Allocated memory series is not available on cluster
    expect(charts[0].props('series')).toHaveLength(1)
  })
  test('display nothing without metrics available on cluster', () => {
    setClusterJobMetrics([])
    const wrapper = mountCharts(jobGpusRunning)
    expect(wrapper.findAllComponents(JobMetricChart)).toHaveLength(0)
    expect(wrapper.text()).toBe('')
  })
  test('display placeholder while loading', async () => {
    mockClusterDataPoller.loaded.value = false
    const wrapper = mountCharts(jobRunning)
    await flushPromises()
    const chart = wrapper.findAllComponents(JobMetricChart)[0]
    expect(chart.get('img[alt="Loading chart"]').attributes('style') ?? '').not.toContain(
      'display: none;'
    )
    expect(chart.get('canvas').attributes('style')).toContain('display: none;')
  })
  test('display chart when loaded', async () => {
    const wrapper = mountCharts(jobRunning)
    await flushPromises()
    const chart = wrapper.findAllComponents(JobMetricChart)[0]
    expect(chart.get('img[alt="Loading chart"]').attributes('style')).toContain('display: none;')
    expect(chart.get('canvas').attributes('style')).not.toContain('display: none;')
    expect(chart.get('p').attributes('style')).toContain('display: none;')
  })
  test('display no data message', async () => {
    mockClusterDataPoller.data.value = { cpu: [], memory: [], memory_allocated: [] }
    const wrapper = mountCharts(jobRunning)
    await flushPromises()
    const chart = wrapper.findAllComponents(JobMetricChart)[0]
    expect(chart.get('p').text()).toBe('No data available')
    expect(chart.get('p').attributes('style') ?? '').not.toContain('display: none;')
    expect(chart.get('canvas').attributes('style')).toContain('display: none;')
  })
  test('display error when unable to retrieve metrics', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mountCharts(jobRunning)
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve job metrics.')
    expect(wrapper.findAllComponents(JobMetricChart)).toHaveLength(0)
  })
  test('pause polling of finished job once metrics are loaded', async () => {
    // Job terminated 1 hour ago
    const end = Math.floor(Date.now() / 1000) - 3600
    mockClusterDataPoller.data.value = undefined
    mountCharts({ ...jobRunning, time: { ...jobRunning.time, end: end } })
    mockClusterDataPoller.data.value = jobMetrics
    await flushPromises()
    expect(mockClusterDataPoller.pause).toHaveBeenCalledOnce()
  })
  test('keep polling running job', async () => {
    mockClusterDataPoller.data.value = undefined
    mountCharts(jobRunning)
    mockClusterDataPoller.data.value = jobMetrics
    await flushPromises()
    expect(mockClusterDataPoller.pause).not.toHaveBeenCalled()
  })
  test('keep polling job terminated recently', async () => {
    // Job terminated 30 seconds ago, last samples may not be scraped yet
    const end = Math.floor(Date.now() / 1000) - 30
    mockClusterDataPoller.data.value = undefined
    mountCharts({ ...jobRunning, time: { ...jobRunning.time, end: end } })
    mockClusterDataPoller.data.value = jobMetrics
    await flushPromises()
    expect(mockClusterDataPoller.pause).not.toHaveBeenCalled()
  })
})
