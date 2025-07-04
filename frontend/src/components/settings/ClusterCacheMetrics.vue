<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'
import type { ClusterDescription, MetricCacheResult } from '@/composables/GatewayAPI'
import { useLiveHistogram } from '@/composables/charts/LiveHistogram'
import ErrorAlert from '@/components/ErrorAlert.vue'

const { cluster } = defineProps<{ cluster: ClusterDescription }>()

const range = ref<string>('hour')

function setRange(newRange: string) {
  range.value = newRange
  chart.setRange(newRange)
}

/* Note that order of keys determines the stack of metrics in histogram */
const labels: Record<string, { group: MetricCacheResult[]; color: string; invert?: boolean }> = {
  hit: {
    group: ['hit'],
    color: 'rgba(51, 204, 51, 0.7)' // green
  },
  miss: {
    group: ['miss'],
    color: 'rgba(214, 93, 11, 0.7)', // dark orange
    invert: true
  }
}

const chartCanvas = useTemplateRef<HTMLCanvasElement>(`chartCanvas`)
const chart = useLiveHistogram<MetricCacheResult>(
  cluster.name,
  'metrics_cache',
  chartCanvas,
  labels,
  range.value
)
</script>

<template>
  <div class="mb-16">
    <div class="border-gray-200p mt-16 dark:border-gray-700">
      <div class="mt-3 text-right sm:mt-0">
        <span class="isolate inline-flex rounded-md shadow-xs">
          <button
            type="button"
            :class="[
              range == 'week'
                ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
                : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
              'relative inline-flex items-center rounded-l-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
            ]"
            @click="setRange('week')"
          >
            week
          </button>
          <button
            type="button"
            :class="[
              range == 'day'
                ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
                : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
              'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
            ]"
            @click="setRange('day')"
          >
            day
          </button>
          <button
            type="button"
            :class="[
              range == 'hour'
                ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
                : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
              'relative inline-flex items-center rounded-r-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
            ]"
            @click="setRange('hour')"
          >
            hour
          </button>
        </span>
      </div>
    </div>
    <ErrorAlert v-if="chart.metrics.unable.value" class="mt-4"
      >Unable to retrieve cache metrics.</ErrorAlert
    >
    <div v-else class="relative h-96 w-full">
      <img
        v-show="!chart.metrics.loaded.value"
        class="h-full object-fill"
        src="/chart_placeholder.svg"
        alt="Loading chart"
      />
      <canvas v-show="chart.metrics.loaded.value" ref="chartCanvas"></canvas>
    </div>
  </div>
</template>
