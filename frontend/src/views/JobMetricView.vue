<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { isJobMetricChartId, useJobMetricsCharts } from '@/composables/JobMetricsCharts'
import type {
  JobMetricChartDefinition,
  JobMetricKind,
  JobMetricResource
} from '@/composables/JobMetricsCharts'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

/* Fullscreen view of a job metric chart, with the metric given by the route. */
const { cluster, id, metric } = defineProps<{ cluster: string; id: number; metric: string }>()

const router = useRouter()

const job = useClusterDataPoller<SlurmJobDetail>(cluster, 'job', 5000, id)

const { metrics, displayedCharts, range, chartSeries } = useJobMetricsCharts(
  () => cluster,
  () => id,
  () => job.data.value
)

const chart = computed(() => displayedCharts.value.find((chart) => chart.id === metric))

function backToJob() {
  router.push({ name: 'job', params: { cluster, id } })
}

/* Navigation buttons: resource (CPU or GPU) and kind of usage (usage or memory)
 * are combined to select the chart. */
const resources: { value: JobMetricResource; label: string }[] = [
  { value: 'cpu', label: 'CPU' },
  { value: 'gpu', label: 'GPU' }
]
const kinds: { value: JobMetricKind; label: string }[] = [
  { value: 'usage', label: 'Usage' },
  { value: 'memory', label: 'Memory' }
]

/* Return the displayed chart with the given resource and kind, or undefined if
 * this chart is not displayed for this job. */
function findChart(
  resource: JobMetricResource,
  kind: JobMetricKind
): JobMetricChartDefinition | undefined {
  return displayedCharts.value.find((item) => item.resource === resource && item.kind === kind)
}

function resourceTarget(resource: JobMetricResource): JobMetricChartDefinition | undefined {
  return chart.value ? findChart(resource, chart.value.kind) : undefined
}

function kindTarget(kind: JobMetricKind): JobMetricChartDefinition | undefined {
  return chart.value ? findChart(chart.value.resource, kind) : undefined
}

function switchTo(target: JobMetricChartDefinition | undefined) {
  if (!target || target.id === metric) return
  router.push({ name: 'job-metric', params: { cluster, id, metric: target.id } })
}

/* Go back to job page when the metric is unknown, or when it is not displayed
 * for this job once loaded (eg. GPU metric of a job without GPU, or jobs
 * metrics not available on cluster). */
watch(
  [() => metric, () => job.loaded.value, displayedCharts],
  () => {
    if (!isJobMetricChartId(metric) || (job.loaded.value && !chart.value)) {
      router.replace({ name: 'job', params: { cluster, id } })
    }
  },
  { immediate: true }
)

const buttonClasses =
  'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
const activeClasses = 'bg-slurmweb dark:bg-slurmweb-dark text-white'
const inactiveClasses =
  'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700'
const disabledClasses =
  'cursor-not-allowed bg-white text-gray-300 dark:bg-gray-800 dark:text-gray-600'

function navigationClasses(
  target: JobMetricChartDefinition | undefined,
  active: boolean,
  index: number,
  count: number
) {
  return [
    target === undefined ? disabledClasses : active ? activeClasses : inactiveClasses,
    buttonClasses,
    index === 0 ? 'rounded-l-md' : '',
    index === count - 1 ? 'rounded-r-md' : ''
  ]
}
</script>

<template>
  <div class="relative flex h-screen min-w-full flex-col bg-white dark:bg-gray-900">
    <!-- Side columns have the same width so navigation stays centered whatever the
    title length. -->
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-6">
      <h3
        class="min-w-0 truncate text-base leading-6 font-semibold text-gray-900 dark:text-gray-100"
      >
        Job {{ id }}<span v-if="chart"> · {{ chart.title }}</span>
      </h3>
      <div
        v-if="chart && displayedCharts.length > 1"
        class="flex items-center justify-center gap-3"
        data-testid="job-metric-navigation"
      >
        <span class="isolate inline-flex rounded-md shadow-xs">
          <button
            v-for="(item, index) in resources"
            :key="item.value"
            type="button"
            :data-testid="`job-metric-nav-${item.value}`"
            :disabled="resourceTarget(item.value) === undefined"
            :class="
              navigationClasses(
                resourceTarget(item.value),
                chart.resource === item.value,
                index,
                resources.length
              )
            "
            @click="switchTo(resourceTarget(item.value))"
          >
            {{ item.label }}
          </button>
        </span>
        <span class="isolate inline-flex rounded-md shadow-xs">
          <button
            v-for="(item, index) in kinds"
            :key="item.value"
            type="button"
            :data-testid="`job-metric-nav-${item.value}`"
            :disabled="kindTarget(item.value) === undefined"
            :class="
              navigationClasses(
                kindTarget(item.value),
                chart.kind === item.value,
                index,
                kinds.length
              )
            "
            @click="switchTo(kindTarget(item.value))"
          >
            {{ item.label }}
          </button>
        </span>
      </div>
      <div v-else></div>
      <button
        type="button"
        class="justify-self-end rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
        data-testid="job-metric-close"
        title="Close"
        @click="backToJob()"
      >
        <span class="sr-only">Close</span>
        <XMarkIcon class="h-6 w-6" />
      </button>
    </div>

    <div v-if="job.unable.value" class="px-6">
      <ErrorAlert
        >Unable to retrieve job {{ id }} from cluster
        <span class="font-medium">{{ cluster }}</span></ErrorAlert
      >
    </div>
    <div v-else-if="metrics.unable.value" class="px-6">
      <ErrorAlert>Unable to retrieve job metrics.</ErrorAlert>
    </div>
    <div v-else-if="!job.loaded.value" class="px-6 text-gray-400">
      <LoadingSpinner :size="5" />
      Loading job {{ id }}
    </div>
    <div v-else-if="chart" class="flex min-h-0 flex-1 flex-col px-6 pb-6">
      <JobMetricChart
        :key="chart.id"
        :title="chart.title"
        :unit="chart.unit"
        :series="chartSeries(chart)"
        :range="range"
        :loaded="metrics.loaded.value"
        :fullscreen="true"
      />
    </div>
  </div>
</template>
