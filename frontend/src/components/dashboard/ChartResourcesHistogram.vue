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
import type { ChartResourcesType } from '@/stores/runtime/dashboard'
import { isChartResourcesType } from '@/stores/runtime/dashboard'
import { useDashboardLiveChart } from '@/composables/dashboard/LiveChart'
import type { GatewayAnyClusterApiKey, MetricResourceState } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'

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

function resourcesTypeCallback(): GatewayAnyClusterApiKey {
  if (runtimeStore.dashboard.chartResourcesType == 'cores') {
    return 'metrics_cores'
  } else if (runtimeStore.dashboard.chartResourcesType == 'gpus') {
    return 'metrics_gpus'
  } else {
    return 'metrics_nodes'
  }
}

const liveChart = useDashboardLiveChart<MetricResourceState>(
  resourcesTypeCallback(),
  chartCanvas,
  statesColors,
  ['unknown', 'down', 'drain', 'allocated', 'mixed', 'idle']
)

function setResourceType(resourceType: ChartResourcesType) {
  runtimeStore.dashboard.chartResourcesType = resourceType
  router.push({ name: 'dashboard', query: runtimeStore.dashboard.query() as LocationQueryRaw })
}

/* Clear chart datasets and set new poller callback when dashboard range is
 * modified. */
watch(
  () => runtimeStore.dashboard.chartResourcesType,
  () => {
    router.push({ name: 'dashboard', query: runtimeStore.dashboard.query() as LocationQueryRaw })
    liveChart.setCallback(resourcesTypeCallback())
  }
)

onBeforeMount(() => {
  if (route.query.resources && isChartResourcesType(route.query.resources)) {
    /* Retrieve the resources criteria from query and update the store */
    runtimeStore.dashboard.chartResourcesType = route.query.resources
  }
})
</script>

<template>
  <div class="border-gray-200p border-b pt-16 pb-5 sm:flex sm:items-center sm:justify-between">
    <h3 class="text-base font-semibold text-gray-900">Resources Status</h3>
    <div class="mt-3 text-right sm:mt-0">
      <span class="isolate inline-flex rounded-md shadow-xs">
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.chartResourcesType == 'nodes'
              ? 'bg-slurmweb text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50',
            'relative inline-flex items-center rounded-l-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10'
          ]"
          @click="setResourceType('nodes')"
        >
          Nodes
        </button>
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.chartResourcesType == 'cores'
              ? 'bg-slurmweb text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50',
            'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10'
          ]"
          @click="setResourceType('cores')"
        >
          Cores
        </button>
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.chartResourcesType == 'gpus'
              ? 'bg-slurmweb text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50',
            'relative inline-flex items-center rounded-r-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10'
          ]"
          @click="setResourceType('gpus')"
        >
          GPU
        </button>
      </span>
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
