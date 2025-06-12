<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { watch } from 'vue'
import type { ClusterDescription, CacheStatistics } from '@/composables/GatewayAPI'
import { useClusterDataPoller } from '@/composables/DataPoller'
import useDoughnutChart from '@/composables/charts/Doughnut'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { cluster } = defineProps<{ cluster: ClusterDescription }>()

const { data, unable, loaded } = useClusterDataPoller<CacheStatistics>(
  cluster.name,
  'cache_stats',
  30000
)

function doughnutChartData() {
  if (!data.value) return [0, 0]
  return [data.value.hit.total, data.value.miss.total]
}

const doughnutChart = useDoughnutChart(
  'chartCanvas',
  [
    { name: 'hit', color: 'rgba(51, 204, 51, 0.7)' },
    { name: 'miss', color: 'rgba(214, 93, 11, 0.7)' }
  ],
  doughnutChartData()
)

watch(
  () => data.value,
  () => doughnutChart.updateData(doughnutChartData())
)

function hit_value(key: string): number {
  if (!data.value) return 0
  return key in data.value.hit.keys ? data.value.hit.keys[key] : 0
}
</script>

<template>
  <div class="align-center mt-8 mb-16 grid grid-cols-1 md:grid-cols-3">
    <ErrorAlert v-if="unable" class="mt-4">Unable to retrieve cache statistics.</ErrorAlert>
    <div v-else-if="!loaded">
      <LoadingSpinner :size="5" />
      Loading statistics…
    </div>
    <div v-else-if="data" class="flow-root md:col-span-2">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-400">
            <thead>
              <tr
                class="divide-x divide-gray-200 text-sm font-semibold text-gray-900 dark:divide-gray-500 dark:text-gray-200"
              >
                <th scope="col" class="py-3.5 pr-4 pl-4 text-left sm:pl-0">Name</th>
                <th scope="col" class="px-4 py-3.5 text-left">Hit</th>
                <th scope="col" class="px-4 py-3.5 text-left">Miss</th>
                <th scope="col" class="px-4 py-3.5 text-left">Total</th>
                <th scope="col" class="py-3.5 pr-4 pl-4 text-left">Hit rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-500">
              <tr
                v-for="(value, key) in data.miss.keys"
                :key="key"
                class="divide-x divide-gray-200 dark:divide-gray-500"
              >
                <td
                  class="py-4 pr-4 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-gray-200"
                >
                  {{ key }}
                </td>
                <td class="p-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ hit_value(key) }}
                </td>
                <td class="p-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ value }}
                </td>
                <td class="p-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ value + hit_value(key) }}
                </td>
                <td
                  class="py-4 pr-4 pl-4 text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400"
                >
                  {{ ((hit_value(key) / (value + hit_value(key))) * 100).toFixed(2) }}%
                </td>
              </tr>
              <tr class="divide-x divide-gray-200 dark:divide-gray-500">
                <td
                  class="py-4 pr-4 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-gray-200"
                >
                  Total
                </td>
                <td class="p-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ data.hit.total }}
                </td>
                <td class="p-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ data.miss.total }}
                </td>
                <td class="p-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ data.hit.total + data.miss.total }}
                </td>
                <td
                  class="py-4 pr-4 pl-4 text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400"
                >
                  {{ ((data.hit.total / (data.miss.total + data.hit.total)) * 100).toFixed(2) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="w-full max-w-72 place-self-center pt-8 md:pt-0">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>
