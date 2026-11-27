<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import { useJobMetricLine } from '@/composables/charts/JobMetricLine'
import type {
  JobMetricRange,
  JobMetricSeries,
  JobMetricUnit
} from '@/composables/charts/JobMetricLine'

const props = withDefaults(
  defineProps<{
    title: string
    unit: JobMetricUnit
    series: JobMetricSeries[]
    range: JobMetricRange
    loaded: boolean
    /* Route of the fullscreen view of this chart, the fullscreen button is
     * displayed when defined. */
    fullscreenRoute?: RouteLocationRaw
    /* True when the chart is displayed in fullscreen view */
    fullscreen?: boolean
  }>(),
  { fullscreenRoute: undefined, fullscreen: false }
)

const router = useRouter()
const chartCanvas = useTemplateRef<HTMLCanvasElement>('chartCanvas')
const hover = ref(false)

/* True when no series has any value */
const empty = computed(() => props.series.every((serie) => serie.values.length === 0))

/* Fullscreen button is displayed when hovering a chart with data */
const displayFullscreenButton = computed(
  () => props.fullscreenRoute !== undefined && hover.value && props.loaded && !empty.value
)

function openFullscreen() {
  if (props.fullscreenRoute) router.push(props.fullscreenRoute)
}

useJobMetricLine(chartCanvas, props.unit, toRef(props, 'series'), toRef(props, 'range'))
</script>

<template>
  <div
    :class="
      fullscreen
        ? 'flex min-h-0 flex-1 flex-col'
        : 'rounded-md border border-gray-200 p-4 dark:border-gray-700'
    "
    @mouseover="hover = true"
    @mouseleave="hover = false"
  >
    <div v-if="!fullscreen" class="mb-1 flex h-8 items-center justify-between">
      <h4 class="text-sm leading-6 font-semibold text-gray-900 dark:text-gray-100">
        {{ title }}
      </h4>
      <button
        v-show="displayFullscreenButton"
        type="button"
        data-testid="job-metric-fullscreen"
        class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
        @click="openFullscreen()"
      >
        <span class="sr-only">fullscreen</span>
        <ArrowsPointingOutIcon class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div :class="[fullscreen ? 'min-h-0 flex-1' : 'h-56', 'relative w-full']">
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
