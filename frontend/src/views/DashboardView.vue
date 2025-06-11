<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { watch } from 'vue'
import { getMBHumanUnit } from '@/composables/GatewayAPI'
import type { ClusterStats } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'
import { useClusterDataPoller } from '@/composables/DataPoller'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import DashboardCharts from '@/components/dashboard/DashboardCharts.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const runtimeStore = useRuntimeStore()

const { cluster } = defineProps<{ cluster: string }>()

const { data, unable, loaded, setCluster } = useClusterDataPoller<ClusterStats>(
  cluster,
  'stats',
  10000
)

watch(
  () => cluster,
  (new_cluster) => {
    setCluster(new_cluster)
  }
)
</script>

<template>
  <ClusterMainLayout
    menu-entry="dashboard"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Dashboard' }]"
  >
    <div class="mx-auto max-w-7xl">
      <ErrorAlert v-if="unable"
        >Unable to retrieve statistics from cluster
        <span class="font-medium">{{ cluster }}</span></ErrorAlert
      >
      <div
        v-else
        class="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-3 xl:grid-cols-6 dark:bg-gray-700"
      >
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
          <p class="text-sm leading-6 font-medium text-gray-400 dark:text-gray-200">Nodes</p>
          <span
            v-if="loaded && data"
            id="metric-nodes"
            class="text-4xl font-semibold tracking-tight text-gray-600 dark:text-gray-500"
          >
            {{ data.resources.nodes }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
          <p class="text-sm leading-6 font-medium text-gray-400 dark:text-gray-200">Cores</p>
          <span
            v-if="loaded && data"
            id="metric-cores"
            class="text-4xl font-semibold tracking-tight text-gray-600 dark:text-gray-500"
          >
            {{ data.resources.cores }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
          <p class="text-sm leading-6 font-medium text-gray-400 dark:text-gray-200">Memory</p>
          <span
            v-if="loaded && data"
            id="metric-cores"
            class="text-4xl font-semibold tracking-tight text-gray-600 dark:text-gray-500"
          >
            {{ getMBHumanUnit(data.resources.memory) }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
          <p class="text-sm leading-6 font-medium text-gray-400 dark:text-gray-200">GPU</p>
          <span
            v-if="loaded && data"
            id="metric-cores"
            :class="[
              data.resources.gpus
                ? 'text-gray-600 dark:text-gray-500'
                : 'text-gray-200 dark:text-gray-700',
              'text-4xl font-semibold tracking-tight'
            ]"
          >
            {{ data.resources.gpus }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
          <p class="text-sm leading-6 font-medium text-gray-400 dark:text-gray-200">Running jobs</p>
          <span
            v-if="loaded && data"
            id="metric-jobs-running"
            class="text-4xl font-semibold tracking-tight text-gray-600 dark:text-gray-500"
          >
            {{ data.jobs.running }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
          <p class="text-sm leading-6 font-medium text-gray-400 dark:text-gray-200">Total jobs</p>
          <span
            v-if="loaded && data"
            id="metric-jobs-total"
            class="text-4xl font-semibold tracking-tight text-gray-600 dark:text-gray-500"
          >
            {{ data.jobs.total }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
      </div>
      <DashboardCharts v-if="runtimeStore.getCluster(cluster).metrics" :cluster="cluster" />
    </div>
  </ClusterMainLayout>
</template>
