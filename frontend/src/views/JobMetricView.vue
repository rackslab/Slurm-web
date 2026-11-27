<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { isJobMetricChartId, useJobMetricsCharts } from '@/composables/JobMetricsCharts'
import type {
  JobMetricChartDefinition,
  JobMetricKind,
  JobMetricResource
} from '@/composables/JobMetricsCharts'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import JobMetricSettingsPane from '@/components/job/JobMetricSettingsPane.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

/* Fullscreen view of a job metric chart, with the metric given by the route. */
const { cluster, id, metric } = defineProps<{ cluster: string; id: number; metric: string }>()

const router = useRouter()
const route = useRoute()

/* Settings of the chart, kept in route query: detail per node or GPU (view),
 * selection of nodes or GPUs (series) and time range (start and end
 * timestamps in seconds). */
interface JobMetricSettings {
  detail: boolean
  selection: string[]
  start?: number
  end?: number
}

function queryTimestamp(name: string): number | undefined {
  const value = route.query[name]
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined
  return parseInt(value)
}

const settings = computed((): JobMetricSettings => {
  const series = route.query.series
  return {
    detail: route.query.view === 'detail',
    selection: typeof series === 'string' && series.length ? series.split(',') : [],
    start: queryTimestamp('start'),
    end: queryTimestamp('end')
  }
})

function settingsQuery(value: JobMetricSettings): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  if (value.detail) {
    query.view = 'detail'
    if (value.selection.length) query.series = value.selection.join(',')
  }
  if (value.start !== undefined) query.start = value.start.toString()
  if (value.end !== undefined) query.end = value.end.toString()
  return query
}

function updateSettings(changes: Partial<JobMetricSettings>) {
  router.replace({
    name: 'job-metric',
    params: { cluster, id, metric },
    query: settingsQuery({ ...settings.value, ...changes })
  })
}

const detail = computed({
  get: () => settings.value.detail,
  set: (value: boolean) => updateSettings({ detail: value })
})
const selection = computed({
  get: () => settings.value.selection,
  set: (value: string[]) => updateSettings({ selection: value })
})
const start = computed({
  get: () => settings.value.start,
  set: (value: number | undefined) => updateSettings({ start: value })
})
const end = computed({
  get: () => settings.value.end,
  set: (value: number | undefined) => updateSettings({ end: value })
})

const job = useClusterDataPoller<SlurmJobDetail>(cluster, 'job', 5000, id)

/* Settings drawer, opened with settings button like filters panels */
const settingsOpen = ref(false)

const { metrics, displayedCharts, range, chartSeries, chartDetailItems, chartDetailSeries } =
  useJobMetricsCharts(
    () => cluster,
    () => id,
    () => job.data.value,
    () => ({ detail: settings.value.detail, start: settings.value.start, end: settings.value.end })
  )

/* Time range of the job in timestamps (seconds), up to now for running jobs */
const jobStart = computed(() => job.data.value?.time.start ?? 0)
const jobEnd = computed(() => {
  const now = Math.floor(Date.now() / 1000)
  const end = job.data.value?.time.end ?? 0
  return end && end < now ? end : now
})

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

/* Switch to another chart, keeping settings. The selection of nodes or GPUs is
 * kept only for charts of the same resource. */
function switchTo(target: JobMetricChartDefinition | undefined) {
  if (!target || target.id === metric) return
  router.push({
    name: 'job-metric',
    params: { cluster, id, metric: target.id },
    query: settingsQuery({
      ...settings.value,
      selection: target.resource === chart.value?.resource ? settings.value.selection : []
    })
  })
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
      <div class="flex items-center justify-end gap-3">
        <button
          v-if="chart"
          type="button"
          class="bg-slurmweb dark:bg-slurmweb-verydark hover:bg-slurmweb-darker focus-visible:outline-slurmweb inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
          data-testid="job-metric-settings-open"
          @click="settingsOpen = true"
        >
          <AdjustmentsHorizontalIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Settings
        </button>
        <button
          type="button"
          class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
          data-testid="job-metric-close"
          title="Close"
          @click="backToJob()"
        >
          <span class="sr-only">Close</span>
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>
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
        :series="detail ? chartDetailSeries(chart, selection) : chartSeries(chart)"
        :range="range"
        :loaded="metrics.loaded.value"
        :fullscreen="true"
      />
      <JobMetricSettingsPane
        v-model:open="settingsOpen"
        v-model:detail="detail"
        v-model:selection="selection"
        v-model:start="start"
        v-model:end="end"
        :resource="chart.resource"
        :items="chartDetailItems(chart)"
        :job-start="jobStart"
        :job-end="jobEnd"
      />
    </div>
  </div>
</template>
