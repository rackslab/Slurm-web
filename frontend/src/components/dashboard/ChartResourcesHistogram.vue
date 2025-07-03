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

const { cluster } = defineProps<{ cluster: string }>()

const router = useRouter()
const route = useRoute()
const runtimeStore = useRuntimeStore()
const chartCanvas = useTemplateRef<HTMLCanvasElement>('chartCanvas')

/* Note that order of keys determines the stack of metrics in histogram */
const labels: Record<string, { group: MetricResourceState[]; color: string }> = {
  unknown: {
    group: ['unknown'],
    color: 'rgb(192, 191, 188, 0.7)' // grey
  },
  down: {
    group: ['down'],
    color: 'rgb(204, 0, 0, 0.7)' // red
  },
  fail: {
    group: ['fail'],
    color: 'rgb(214, 93, 11, 0.7)' // dark orange
  },
  error: {
    group: ['error'],
    color: 'rgb(143, 23, 49, 0.7)' // dark purple
  },
  drain: {
    group: ['drain'],
    color: 'rgb(204, 0, 153, 0.7)' // purple
  },
  allocated: {
    group: ['allocated'],
    color: 'rgba(236, 183, 23, 0.7)' // ellow
  },
  mixed: {
    group: ['mixed'],
    color: 'rgba(246, 221, 56, 0.7)' // light yellow
  },
  idle: {
    group: ['idle'],
    color: 'rgb(51, 204, 51, 0.7)' // green
  }
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
  cluster,
  resourcesTypeCallback(),
  chartCanvas,
  labels,
  runtimeStore.dashboard.range
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

onBeforeMount(() => {
  if (route.query.resources && isChartResourcesType(route.query.resources)) {
    /* Retrieve the resources criteria from query and update the store */
    runtimeStore.dashboard.chartResourcesType = route.query.resources
  }
})
</script>

<template>
  <div
    class="border-b border-gray-200 pt-16 pb-5 sm:flex sm:items-center sm:justify-between dark:border-gray-700"
  >
    <h3 class="text-base font-semibold text-gray-900 dark:text-gray-200">Resources Status</h3>
    <div class="mt-3 text-right sm:mt-0">
      <span class="isolate inline-flex rounded-md shadow-xs">
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.chartResourcesType == 'nodes'
              ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
            'relative inline-flex items-center rounded-l-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
          ]"
          @click="setResourceType('nodes')"
        >
          Nodes
        </button>
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.chartResourcesType == 'cores'
              ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
            'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
          ]"
          @click="setResourceType('cores')"
        >
          Cores
        </button>
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.chartResourcesType == 'gpus'
              ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
            'relative inline-flex items-center rounded-r-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
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
