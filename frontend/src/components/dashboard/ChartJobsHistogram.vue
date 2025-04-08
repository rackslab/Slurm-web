<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useDashboardLiveChart } from '@/composables/dashboard/LiveChart'
import type { MetricJobState } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'

const chartCanvas = useTemplateRef<HTMLCanvasElement>('chartCanvas')

const statesColors: Record<MetricJobState, string> = {
  running: 'rgb(51, 204, 51, 0.7)', // green
  pending: 'rgba(255, 204, 0, 0.7)', // yellow
  completing: 'rgba(204, 153, 0, 0.7)', // dark yellow
  completed: 'rgb(192, 191, 188, 0.7)', // grey
  failed: 'rgb(199, 40, 43, 0.7)', // red
  timeout: 'rgb(214, 93, 11, 0.7)', // dark orange
  cancelled: 'rgb(204, 0, 153, 0.7)', // purple
  unknown: 'rgb(30, 30, 30, 0.7)' // dark grey
}

const liveChart = useDashboardLiveChart<MetricJobState>('metrics_jobs', chartCanvas, statesColors, [
  'unknown',
  'cancelled',
  'completed',
  'failed',
  'timeout',
  'completing',
  'running',
  'pending'
])
</script>

<template>
  <div class="border-gray-200p border-b pt-16 pb-5 sm:flex sm:items-center sm:justify-between">
    <h3 class="text-base font-semibold text-gray-900">Jobs Queue</h3>
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
