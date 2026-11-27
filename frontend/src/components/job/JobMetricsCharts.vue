<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { useRuntimeStore } from '@/stores/runtime'
import ErrorAlert from '@/components/ErrorAlert.vue'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import type {
  JobMetricRange,
  JobMetricSeries,
  JobMetricUnit
} from '@/composables/charts/JobMetricLine'
import type { JobMetric, JobMetrics } from '@/composables/gateway/types/metrics'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'
import { jobAllocatedGPU } from '@/composables/gateway/slurm/job'

const { cluster, id, job } = defineProps<{ cluster: string; id: number; job: SlurmJobDetail }>()

const runtimeStore = useRuntimeStore()

const metrics = useClusterDataPoller<JobMetrics>(cluster, 'job_metrics', 30000, id)

interface JobMetricChartDefinition {
  id: string
  title: string
  unit: JobMetricUnit
  /* Metric which must be available in cluster to display the chart */
  metric: JobMetric
  series: { metric: JobMetric; label: string; color: string; dashed?: boolean }[]
  gpu?: boolean
}

const charts: JobMetricChartDefinition[] = [
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

/* Metrics available on the cluster */
const available = computed((): JobMetric[] => runtimeStore.getCluster(cluster)?.job_metrics ?? [])

/* GPU charts are displayed only for jobs with allocated GPUs */
const hasGPU = computed(() => jobAllocatedGPU(job) > 0)

const displayedCharts = computed(() =>
  charts.filter((chart) => available.value.includes(chart.metric) && (!chart.gpu || hasGPU.value))
)

/* Range of x-axis, from job start to job end or now for running jobs. */
const range = computed((): JobMetricRange => {
  const now = Date.now()
  const end = job.time.end && job.time.end * 1000 < now ? job.time.end * 1000 : now
  return { min: job.time.start * 1000, max: end }
})

/* Delay after job end during which metrics are still polled, so the last samples
 * scraped by Prometheus after the end of the job are retrieved. */
const FINISHED_JOB_POLLING_DELAY = 2 * 60 * 1000

/* True when job is terminated for long enough to get all its metrics. */
function jobFinished(): boolean {
  return job.time.end > 0 && job.time.end * 1000 + FINISHED_JOB_POLLING_DELAY < Date.now()
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
  () => cluster,
  (newCluster) => {
    metrics.setCluster(newCluster)
  }
)
watch(
  () => id,
  (newId) => {
    metrics.setParam(newId)
  }
)
</script>

<template>
  <div v-if="displayedCharts.length" class="mt-8">
    <h3 class="text-base leading-7 font-semibold text-gray-900 dark:text-gray-100">
      Resources usage
    </h3>
    <ErrorAlert v-if="metrics.unable.value" class="mt-4"
      >Unable to retrieve job metrics.</ErrorAlert
    >
    <div v-else class="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <JobMetricChart
        v-for="chart in displayedCharts"
        :key="chart.id"
        :id="`job-metric-${chart.id}`"
        :title="chart.title"
        :unit="chart.unit"
        :series="chartSeries(chart)"
        :range="range"
        :loaded="metrics.loaded.value"
      />
    </div>
  </div>
</template>
