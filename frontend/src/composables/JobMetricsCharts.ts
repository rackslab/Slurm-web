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
import type { JobMetric, JobMetrics } from '@/composables/gateway/types/metrics'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'
import { jobAllocatedGPU } from '@/composables/gateway/slurm/job'

const JobMetricChartIds = ['cpu', 'memory', 'gpu', 'gpu-memory'] as const
export type JobMetricChartId = (typeof JobMetricChartIds)[number]

export function isJobMetricChartId(id: unknown): id is JobMetricChartId {
  return typeof id === 'string' && JobMetricChartIds.includes(id as JobMetricChartId)
}

export interface JobMetricChartDefinition {
  id: JobMetricChartId
  title: string
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
    unit: 'percent',
    metric: 'cpu',
    series: [{ metric: 'cpu', label: 'CPU', color: 'rgba(59, 130, 246, 1)' }]
  },
  {
    id: 'memory',
    title: 'Memory usage',
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
    unit: 'percent',
    metric: 'gpu',
    series: [{ metric: 'gpu', label: 'GPU', color: 'rgba(168, 85, 247, 1)' }],
    gpu: true
  },
  {
    id: 'gpu-memory',
    title: 'GPU memory usage',
    unit: 'percent',
    metric: 'gpu_memory',
    series: [{ metric: 'gpu_memory', label: 'GPU memory', color: 'rgba(236, 72, 153, 1)' }],
    gpu: true
  }
]

/* Delay after job end during which metrics are still polled, so the last samples
 * scraped by Prometheus after the end of the job are retrieved. */
const FINISHED_JOB_POLLING_DELAY = 2 * 60 * 1000

export interface JobMetricsCharts {
  metrics: ClusterDataPoller<JobMetrics>
  displayedCharts: ComputedRef<JobMetricChartDefinition[]>
  range: ComputedRef<JobMetricRange>
  chartSeries: (chart: JobMetricChartDefinition) => JobMetricSeries[]
}

/* Poll metrics of the given job and select the charts to display, depending on
 * the metrics available on the cluster and the job resources. The job may be
 * undefined while it is not loaded yet. */
export function useJobMetricsCharts(
  cluster: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<number>,
  job: MaybeRefOrGetter<SlurmJobDetail | undefined>
): JobMetricsCharts {
  const runtimeStore = useRuntimeStore()

  const metrics = useClusterDataPoller<JobMetrics>(
    toValue(cluster),
    'job_metrics',
    30000,
    toValue(id)
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

  /* Range of x-axis, from job start to job end or now for running jobs. */
  const range = computed((): JobMetricRange => {
    const now = Date.now()
    const _job = toValue(job)
    if (!_job) return { min: now, max: now }
    const end = _job.time.end && _job.time.end * 1000 < now ? _job.time.end * 1000 : now
    return { min: _job.time.start * 1000, max: end }
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

  function chartSeries(chart: JobMetricChartDefinition): JobMetricSeries[] {
    return chart.series
      .filter((serie) => serie.metric === chart.metric || available.value.includes(serie.metric))
      .map((serie) => ({
        label: serie.label,
        color: serie.color,
        dashed: serie.dashed,
        values: metrics.data.value?.[serie.metric] ?? []
      }))
  }

  watch(
    () => toValue(cluster),
    (newCluster) => {
      metrics.setCluster(newCluster)
    }
  )
  watch(
    () => toValue(id),
    (newId) => {
      metrics.setParam(newId)
    }
  )

  return { metrics, displayedCharts, range, chartSeries }
}
