<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { useLiveHistogram } from '@/composables/charts/LiveHistogram'
import type { MetricJobState } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'
import ErrorAlert from '@/components/ErrorAlert.vue'

const { cluster } = defineProps<{ cluster: string }>()

const runtimeStore = useRuntimeStore()
const chartCanvas = useTemplateRef<HTMLCanvasElement>('chartCanvas')

/* Note that order of keys determines the stack of metrics in histogram */
const labels: Record<string, { group: MetricJobState[]; color: string }> = {
  unknown: {
    group: ['unknown'],
    color: 'rgba(30, 30, 30, 0.7)' // dark grey
  },
  timeout: {
    group: ['timeout'],
    color: 'rgba(214, 93, 11, 0.7)' // dark orange
  },
  failed: {
    group: ['failed', 'deadline', 'node_fail', 'boot_fail', 'out_of_memory'],
    color: 'rgba(199, 40, 43, 0.7)' // red
  },
  cancelled: {
    group: ['cancelled', 'preempted'],
    color: 'rgba(204, 0, 153, 0.7)' // fuschia
  },
  suspended: {
    group: ['suspended'],
    color: 'rgba(114, 52, 167, 0.7)' // purple
  },
  completed: {
    group: ['completed'],
    color: 'rgba(192, 191, 188, 0.7)' // grey
  },
  completing: {
    group: ['completing'],
    color: 'rgba(204, 153, 0, 0.7)' // dark yellow
  },
  pending: {
    group: ['pending'],
    color: 'rgba(255, 204, 0, 0.7)' // yellow
  },
  running: {
    group: ['running'],
    color: 'rgba(51, 204, 51, 0.7)' // green
  }
}

const liveChart = useLiveHistogram<MetricJobState>(
  cluster,
  'metrics_jobs',
  chartCanvas,
  labels,
  runtimeStore.dashboard.range
)

watch(
  () => runtimeStore.dashboard.range,
  () => {
    liveChart.setRange(runtimeStore.dashboard.range)
  }
)

watch(
  () => cluster,
  (new_cluster) => {
    liveChart.setCluster(new_cluster)
  }
)
</script>

<template>
  <div
    class="border-b border-gray-200 pt-16 pb-5 sm:flex sm:items-center sm:justify-between dark:border-gray-700"
  >
    <h3 class="text-base font-semibold text-gray-900 dark:text-gray-200">Jobs Queue</h3>
  </div>
  <ErrorAlert v-if="liveChart.metrics.unable.value" class="mt-4"
    >Unable to retrieve jobs metrics.</ErrorAlert
  >
  <div v-else class="h-96 w-full">
    <img
      v-show="!liveChart.metrics.loaded.value"
      class="h-full object-fill"
      src="/chart_placeholder.svg"
      alt="Loading chart"
    />
    <canvas v-show="liveChart.metrics.loaded.value" ref="chartCanvas"></canvas>
  </div>
</template>
