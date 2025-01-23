<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { ClusterStats } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'
import { useClusterDataPoller } from '@/composables/DataPoller'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import DashboardCharts from '@/components/dashboard/DashboardCharts.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const runtimeStore = useRuntimeStore()

const { cluster } = defineProps<{ cluster: string }>()

const { data, unable } = useClusterDataPoller<ClusterStats>('stats', 10000)
</script>

<template>
  <ClusterMainLayout :cluster="cluster" :breadcrumb="[{ title: 'Dashboard' }]">
    <div class="mx-auto max-w-7xl bg-white">
      <ErrorAlert v-if="unable"
        >Unable to retrieve statistics from cluster
        <span class="font-medium">{{ cluster }}</span></ErrorAlert
      >
      <div v-else class="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Nodes</p>
          <span
            v-if="data"
            id="metric-nodes"
            class="text-4xl font-semibold tracking-tight text-gray-600"
          >
            {{ data.resources.nodes }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Cores</p>
          <span
            v-if="data"
            id="metric-cores"
            class="text-4xl font-semibold tracking-tight text-gray-600"
          >
            {{ data.resources.cores }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Running jobs</p>
          <span
            v-if="data"
            id="metric-jobs-running"
            class="text-4xl font-semibold tracking-tight text-gray-600"
          >
            {{ data.jobs.running }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-200"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Total jobs</p>
          <span
            v-if="data"
            id="metric-jobs-total"
            class="text-4xl font-semibold tracking-tight text-gray-600"
          >
            {{ data.jobs.total }}
          </span>
          <div v-else class="flex animate-pulse space-x-4">
            <div class="h-10 w-10 rounded-full bg-slate-100"></div>
          </div>
        </div>
      </div>
      <DashboardCharts v-if="runtimeStore.getCluster(cluster).metrics"></DashboardCharts>
    </div>
  </ClusterMainLayout>
</template>
