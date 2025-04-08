<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onBeforeMount, useTemplateRef, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useDashboardLiveChart } from '@/composables/dashboard/LiveChart'
import type { MetricResourceState } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { Switch } from '@headlessui/vue'

const router = useRouter()
const route = useRoute()
const runtimeStore = useRuntimeStore()
const chartCanvas = useTemplateRef<HTMLCanvasElement>('chartCanvas')

const statesColors: Record<MetricResourceState, string> = {
  idle: 'rgb(51, 204, 51, 0.7)', // green
  down: 'rgb(204, 0, 0, 0.7)', // red
  mixed: 'rgba(255, 204, 0, 0.7)', // yellow
  allocated: 'rgba(204, 153, 0, 0.7)', // dark yellow
  drain: 'rgb(204, 0, 153, 0.7)', // purple
  unknown: 'rgb(192, 191, 188, 0.7)' // grey
}

const liveChart = useDashboardLiveChart<MetricResourceState>(
  runtimeStore.dashboard.coresToggle ? 'metrics_cores' : 'metrics_nodes',
  chartCanvas,
  statesColors,
  ['unknown', 'down', 'drain', 'allocated', 'mixed', 'idle']
)

/* Clear chart datasets and set new poller callback when dashboard range is
 * modified. */
watch(
  () => runtimeStore.dashboard.coresToggle,
  () => {
    router.push({ name: 'dashboard', query: runtimeStore.dashboard.query() as LocationQueryRaw })
    if (runtimeStore.dashboard.coresToggle) {
      liveChart.setCallback('metrics_cores')
    } else {
      liveChart.setCallback('metrics_nodes')
    }
  }
)

onBeforeMount(() => {
  if (route.query.cores && typeof route.query.cores === 'string' && route.query.cores === 'true') {
    /* Retrieve the range criteria from query and update the store */
    runtimeStore.dashboard.coresToggle = true
  }
})
</script>

<template>
  <div class="border-gray-200p border-b pt-16 pb-5 sm:flex sm:items-center sm:justify-between">
    <h3 class="text-base font-semibold text-gray-900">Resources Status</h3>
    <div class="mt-3 inline-flex items-center text-sm sm:mt-0 sm:ml-4">
      <span class="pr-2">Nodes</span>
      <Switch
        v-model="runtimeStore.dashboard.coresToggle"
        :class="[
          runtimeStore.dashboard.coresToggle ? 'bg-slurmweb' : 'bg-gray-200',
          'focus:ring-slurmweb relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none'
        ]"
      >
        <span
          aria-hidden="true"
          :class="[
            runtimeStore.dashboard.coresToggle ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out'
          ]"
        />
      </Switch>
      <span class="pl-2">Cores</span>
    </div>
  </div>
  <ErrorAlert v-if="liveChart.metrics.unable.value" class="mt-4"
    >Unable to retrieve resource metrics.</ErrorAlert
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
