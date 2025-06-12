<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import { useRuntimeStore } from '@/stores/runtime'
import ClusterCacheStatistics from '@/components/settings/ClusterCacheStatistics.vue'
import ClusterCacheMetrics from '@/components/settings/ClusterCacheMetrics.vue'
const runtimeStore = useRuntimeStore()
</script>

<template>
  <SettingsTabs entry="Cache" />
  <div class="px-4 pt-16 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base leading-6 font-semibold text-gray-900 dark:text-gray-100">
          Cache Service
        </h1>
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Cache service information and metrics.
        </p>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div
            v-for="cluster in runtimeStore.availableClusters"
            :key="cluster.name"
            class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
          >
            <div>Cluster {{ cluster.name }}</div>
            <div v-if="!runtimeStore.hasClusterPermission(cluster.name, 'view-cache')">
              No permission to get cache information on this cluster.
            </div>
            <div v-else-if="!cluster.cache">Cache is disabled</div>
            <template v-else>
              <ClusterCacheStatistics :cluster="cluster" />
              <ClusterCacheMetrics v-if="cluster.metrics" :cluster="cluster" />
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
