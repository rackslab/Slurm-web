<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { ClusterDescription, MetricCacheResult } from '@/composables/GatewayAPI'
import { useDashboardLiveChart } from '@/composables/dashboard/LiveChart'
import ErrorAlert from '@/components/ErrorAlert.vue'

const { cluster } = defineProps<{ cluster: ClusterDescription }>()

/* Note that order of keys determines the stack of metrics in histogram */
const labels: Record<string, { group: MetricCacheResult[]; color: string }> = {
  miss: {
    group: ['miss'],
    color: 'rgba(214, 93, 11, 0.7)' // dark orange
  },
  hit: {
    group: ['hit'],
    color: 'rgba(51, 204, 51, 0.7)' // green
  }
}

const chartCanvas = useTemplateRef<HTMLCanvasElement>(`chartCanvas`)
const chart = useDashboardLiveChart<MetricCacheResult>(
  cluster.name,
  'metrics_cache',
  chartCanvas,
  labels
)
</script>

<template>
  <ErrorAlert v-if="chart.metrics.unable.value" class="mt-4"
    >Unable to retrieve cache metrics.</ErrorAlert
  >
  <div v-else class="h-96 w-full">
    <img
      v-show="!chart.metrics.loaded.value"
      class="h-full object-fill"
      src="/chart_placeholder.svg"
      alt="Loading chart"
    />
    <canvas v-show="chart.metrics.loaded.value" ref="chartCanvas"></canvas>
  </div>
</template>
