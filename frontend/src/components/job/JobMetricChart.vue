<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, toRef, useTemplateRef } from 'vue'
import { useJobMetricLine } from '@/composables/charts/JobMetricLine'
import type {
  JobMetricRange,
  JobMetricSeries,
  JobMetricUnit
} from '@/composables/charts/JobMetricLine'

const props = defineProps<{
  title: string
  unit: JobMetricUnit
  series: JobMetricSeries[]
  range: JobMetricRange
  loaded: boolean
}>()

const chartCanvas = useTemplateRef<HTMLCanvasElement>('chartCanvas')

/* True when no series has any value */
const empty = computed(() => props.series.every((serie) => serie.values.length === 0))

useJobMetricLine(chartCanvas, props.unit, toRef(props, 'series'), toRef(props, 'range'))
</script>

<template>
  <div class="rounded-md border border-gray-200 p-4 dark:border-gray-700">
    <h4 class="text-sm leading-6 font-semibold text-gray-900 dark:text-gray-100">
      {{ title }}
    </h4>
    <div class="relative h-56 w-full">
      <img
        v-show="!loaded"
        class="h-full w-full object-fill"
        src="/chart_placeholder.svg"
        alt="Loading chart"
      />
      <p
        v-show="loaded && empty"
        class="absolute inset-0 flex items-center justify-center text-sm text-gray-400"
      >
        No data available
      </p>
      <canvas v-show="loaded && !empty" ref="chartCanvas"></canvas>
    </div>
  </div>
</template>
