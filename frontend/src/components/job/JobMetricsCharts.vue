<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import ErrorAlert from '@/components/ErrorAlert.vue'
import JobMetricChart from '@/components/job/JobMetricChart.vue'
import { useJobMetricsCharts } from '@/composables/JobMetricsCharts'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

const { cluster, id, job } = defineProps<{ cluster: string; id: number; job: SlurmJobDetail }>()

const { metrics, displayedCharts, range, chartSeries } = useJobMetricsCharts(
  () => cluster,
  () => id,
  () => job
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
