<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import ChartResourcesHistogram from '@/components/dashboard/ChartResourcesHistogram.vue'
import ChartJobsHistogram from '@/components/dashboard/ChartJobsHistogram.vue'
import { isMetricRange, type MetricRange } from '@/composables/GatewayAPI'

const { cluster } = defineProps<{ cluster: string }>()

const router = useRouter()
const route = useRoute()
const runtimeStore = useRuntimeStore()

function setRange(range: MetricRange) {
  runtimeStore.dashboard.range = range
  router.push({ name: 'dashboard', query: runtimeStore.dashboard.query() as LocationQueryRaw })
}

onBeforeMount(() => {
  if (route.query.range && isMetricRange(route.query.range)) {
    /* Retrieve the range criteria from query and update the store */
    runtimeStore.dashboard.range = route.query.range
  } else {
    runtimeStore.dashboard.range = 'hour'
  }
})
</script>

<template>
  <div class="border-gray-200p pt-16 dark:border-gray-700">
    <div class="mt-3 text-right sm:mt-0">
      <span class="isolate inline-flex rounded-md shadow-xs">
        <button
          type="button"
          :class="[
            runtimeStore.dashboard.range == 'week'
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
            runtimeStore.dashboard.range == 'day'
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
            runtimeStore.dashboard.range == 'hour'
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
  <ChartResourcesHistogram v-if="runtimeStore.hasPermission('view-nodes')" :cluster="cluster" />
  <ChartJobsHistogram v-if="runtimeStore.hasPermission('view-jobs')" :cluster="cluster" />
</template>
