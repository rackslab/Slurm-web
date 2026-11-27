/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { computed, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterDataPoller } from '@/composables/DataPoller'
import { useRuntimeStore } from '@/stores/runtime'
import type {
  JobMetricRange,
  JobMetricSeries,
  JobMetricUnit
} from '@/composables/charts/JobMetricLine'
import type {
  JobMetric,
  JobMetricDetailSeries,
  JobMetrics,
  JobMetricsDetail,
  MetricValue
} from '@/composables/gateway/types/metrics'
import type { JobMetricsQuery } from '@/composables/gateway/types/metrics'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'
import { jobAllocatedGPU } from '@/composables/gateway/slurm/job'

const JobMetricChartIds = ['cpu', 'memory', 'gpu', 'gpu-memory'] as const
export type JobMetricChartId = (typeof JobMetricChartIds)[number]

export function isJobMetricChartId(id: unknown): id is JobMetricChartId {
  return typeof id === 'string' && JobMetricChartIds.includes(id as JobMetricChartId)
}

/* Resource and kind of usage of job metric charts, combined in fullscreen view
 * navigation. */
export type JobMetricResource = 'cpu' | 'gpu'
export type JobMetricKind = 'usage' | 'memory'

export interface JobMetricChartDefinition {
  id: JobMetricChartId
  title: string
  resource: JobMetricResource
  kind: JobMetricKind
  unit: JobMetricUnit
  /* Metric which must be available in cluster to display the chart */
  metric: JobMetric
  series: { metric: JobMetric; label: string; color: string; dashed?: boolean }[]
  gpu?: boolean
}

export const JOB_METRIC_CHARTS: JobMetricChartDefinition[] = [
  {
    id: 'cpu',
    title: 'CPU usage',
    resource: 'cpu',
    kind: 'usage',
    unit: 'percent',
    metric: 'cpu',
    series: [{ metric: 'cpu', label: 'CPU', color: 'rgba(59, 130, 246, 1)' }]
  },
  {
    id: 'memory',
    title: 'Memory usage',
    resource: 'cpu',
    kind: 'memory',
    unit: 'bytes',
    metric: 'memory',
    series: [
      { metric: 'memory', label: 'Used', color: 'rgba(16, 185, 129, 1)' },
      {
        metric: 'memory_allocated',
        label: 'Allocated',
        color: 'rgba(107, 114, 128, 1)',
        dashed: true
      }
    ]
  },
  {
    id: 'gpu',
    title: 'GPU usage',
    resource: 'gpu',
    kind: 'usage',
    unit: 'percent',
    metric: 'gpu',
    series: [{ metric: 'gpu', label: 'GPU', color: 'rgba(168, 85, 247, 1)' }],
    gpu: true
  },
  {
    id: 'gpu-memory',
    title: 'GPU memory usage',
    resource: 'gpu',
    kind: 'memory',
    unit: 'percent',
    metric: 'gpu_memory',
    series: [{ metric: 'gpu_memory', label: 'GPU memory', color: 'rgba(236, 72, 153, 1)' }],
    gpu: true
  }
]

/* Delay after job end during which metrics are still polled, so the last samples
 * scraped by Prometheus after the end of the job are retrieved. */
const FINISHED_JOB_POLLING_DELAY = 2 * 60 * 1000

/* Colors of series detailed per node or GPU, assigned in order of series. */
export const JOB_METRIC_DETAIL_COLORS = [
  'rgba(59, 130, 246, 1)', // blue
  'rgba(16, 185, 129, 1)', // green
  'rgba(245, 158, 11, 1)', // amber
  'rgba(168, 85, 247, 1)', // purple
  'rgba(236, 72, 153, 1)', // pink
  'rgba(20, 184, 166, 1)', // teal
  'rgba(239, 68, 68, 1)', // red
  'rgba(132, 204, 22, 1)', // lime
  'rgba(99, 102, 241, 1)', // indigo
  'rgba(249, 115, 22, 1)' // orange
]

/* Options of job metrics charts: detail per node or GPU and time range in
 * timestamps (seconds). */
export interface JobMetricsChartsOptions {
  detail: boolean
  start?: number
  end?: number
}

/* Node or GPU of detailed series, with identifier used in selection and
 * label. */
export interface JobMetricDetailItem {
  id: string
  label: string
}

/* Return identifier of series detailed per node or GPU */
export function jobMetricDetailId(series: JobMetricDetailSeries): string {
  return series.gpu === undefined ? series.node : `${series.node}/${series.gpu}`
}

function jobMetricDetailLabel(series: JobMetricDetailSeries): string {
  return series.gpu === undefined ? series.node : `${series.node} · GPU ${series.gpu}`
}

function isDetailSeries(values: unknown): values is JobMetricDetailSeries[] {
  return Array.isArray(values) && values.every((item) => !Array.isArray(item))
}

function isAggregateSeries(values: unknown): values is MetricValue[] {
  return Array.isArray(values) && values.every((item) => Array.isArray(item))
}

export interface JobMetricsCharts {
  metrics: ClusterDataPoller<JobMetrics | JobMetricsDetail>
  displayedCharts: ComputedRef<JobMetricChartDefinition[]>
  range: ComputedRef<JobMetricRange>
  chartSeries: (chart: JobMetricChartDefinition) => JobMetricSeries[]
  chartDetailItems: (chart: JobMetricChartDefinition) => JobMetricDetailItem[]
  chartDetailSeries: (chart: JobMetricChartDefinition, selection: string[]) => JobMetricSeries[]
}

/* Poll metrics of the given job and select the charts to display, depending on
 * the metrics available on the cluster and the job resources. The job may be
 * undefined while it is not loaded yet. When options are given, metrics can be
 * detailed per node or GPU and restricted to a time range. */
export function useJobMetricsCharts(
  cluster: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<number>,
  job: MaybeRefOrGetter<SlurmJobDetail | undefined>,
  options?: MaybeRefOrGetter<JobMetricsChartsOptions>
): JobMetricsCharts {
  const runtimeStore = useRuntimeStore()

  function query(): JobMetricsQuery {
    const _options = toValue(options)
    return {
      job: toValue(id),
      detail: _options?.detail || undefined,
      start: _options?.start,
      end: _options?.end
    }
  }

  const metrics =
    options === undefined
      ? useClusterDataPoller<JobMetrics | JobMetricsDetail>(
          toValue(cluster),
          'job_metrics',
          30000,
          toValue(id)
        )
      : useClusterDataPoller<JobMetrics | JobMetricsDetail>(
          toValue(cluster),
          'job_metrics_query',
          30000,
          query()
        )

  /* Metrics available on the cluster */
  const available = computed(
    (): JobMetric[] => runtimeStore.getCluster(toValue(cluster))?.job_metrics ?? []
  )

  /* GPU charts are displayed only for jobs with allocated GPUs */
  const hasGPU = computed(() => {
    const _job = toValue(job)
    return _job !== undefined && jobAllocatedGPU(_job) > 0
  })

  const displayedCharts = computed(() =>
    JOB_METRIC_CHARTS.filter(
      (chart) => available.value.includes(chart.metric) && (!chart.gpu || hasGPU.value)
    )
  )

  /* Range of x-axis, from job start to job end or now for running jobs,
   * restricted to the time range of options. */
  const range = computed((): JobMetricRange => {
    const now = Date.now()
    const _job = toValue(job)
    if (!_job) return { min: now, max: now }
    let min = _job.time.start * 1000
    let max = _job.time.end && _job.time.end * 1000 < now ? _job.time.end * 1000 : now
    const _options = toValue(options)
    if (_options?.start !== undefined) min = Math.max(min, _options.start * 1000)
    if (_options?.end !== undefined) max = Math.min(max, _options.end * 1000)
    return { min, max }
  })

  /* True when job is terminated for long enough to get all its metrics. */
  function jobFinished(): boolean {
    const _job = toValue(job)
    return (
      _job !== undefined &&
      _job.time.end > 0 &&
      _job.time.end * 1000 + FINISHED_JOB_POLLING_DELAY < Date.now()
    )
  }

  /* Metrics of finished jobs do not change anymore, stop polling them once
   * loaded. */
  watch(
    () => metrics.data.value,
    () => {
      if (metrics.loaded.value && jobFinished()) {
        metrics.pause()
      }
    }
  )

  /* Return aggregated values of the given metric, empty while detailed series
   * are loaded. */
  function aggregateValues(metric: JobMetric): MetricValue[] {
    const values = metrics.data.value?.[metric]
    return isAggregateSeries(values) ? values : []
  }

  /* Return detailed series of the given metric, empty while aggregated values are
   * loaded. */
  function detailValues(metric: JobMetric): JobMetricDetailSeries[] {
    const values = metrics.data.value?.[metric]
    return isDetailSeries(values) ? values : []
  }

  function chartSeries(chart: JobMetricChartDefinition): JobMetricSeries[] {
    return chart.series
      .filter((serie) => serie.metric === chart.metric || available.value.includes(serie.metric))
      .map((serie) => ({
        label: serie.label,
        color: serie.color,
        dashed: serie.dashed,
        values: aggregateValues(serie.metric)
      }))
  }

  /* Return nodes or GPUs of detailed series of the chart */
  function chartDetailItems(chart: JobMetricChartDefinition): JobMetricDetailItem[] {
    return detailValues(chart.metric).map((series) => ({
      id: jobMetricDetailId(series),
      label: jobMetricDetailLabel(series)
    }))
  }

  /* Return one series per node or GPU of the chart, restricted to the selected
   * nodes or GPUs (all when selection is empty). Every node or GPU keeps the same
   * color whatever the selection. Secondary metrics of the chart (eg. allocated
   * memory) are drawn with dashed lines with the color of the node. */
  function chartDetailSeries(
    chart: JobMetricChartDefinition,
    selection: string[]
  ): JobMetricSeries[] {
    const result: JobMetricSeries[] = []
    detailValues(chart.metric).forEach((series, index) => {
      const itemId = jobMetricDetailId(series)
      if (selection.length && !selection.includes(itemId)) return
      const color = JOB_METRIC_DETAIL_COLORS[index % JOB_METRIC_DETAIL_COLORS.length]
      const label = jobMetricDetailLabel(series)
      result.push({ label, color, values: series.values })
      chart.series
        .filter((serie) => serie.metric !== chart.metric && available.value.includes(serie.metric))
        .forEach((serie) => {
          const secondary = detailValues(serie.metric).find(
            (item) => jobMetricDetailId(item) === itemId
          )
          if (secondary) {
            result.push({
              label: `${label} ${serie.label.toLowerCase()}`,
              color,
              dashed: serie.dashed,
              values: secondary.values
            })
          }
        })
    })
    return result
  }

  watch(
    () => toValue(cluster),
    (newCluster) => {
      metrics.setCluster(newCluster)
    }
  )
  if (options === undefined) {
    watch(
      () => toValue(id),
      (newId) => {
        metrics.setParam(newId)
      }
    )
  } else {
    /* Restart polling only when the query actually changes. */
    watch(
      () => JSON.stringify(query()),
      () => {
        metrics.setParam(query())
      }
    )
  }

  return { metrics, displayedCharts, range, chartSeries, chartDetailItems, chartDetailSeries }
}
