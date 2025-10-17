<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import { useRuntimeStore } from '@/stores/runtime'
import SettingsCacheStatistics from '@/components/settings/SettingsCacheStatistics.vue'
import SettingsCacheMetrics from '@/components/settings/SettingsCacheMetrics.vue'
import InfoAlert from '@/components/InfoAlert.vue'
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
        <template v-for="cluster in runtimeStore.availableClusters" :key="cluster.name">
          <div class="min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div class="border-b border-gray-200 pb-5 dark:border-gray-600">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                Cluster {{ cluster.name }}
              </h3>
            </div>
            <InfoAlert v-if="!runtimeStore.hasClusterPermission(cluster.name, 'cache-view')"
              >No permission to get cache information on this cluster.</InfoAlert
            >
            <InfoAlert v-else-if="!cluster.cache">Cache is disabled on this cluster.</InfoAlert>
            <template v-else>
              <SettingsCacheStatistics :cluster="cluster" />
              <SettingsCacheMetrics v-if="cluster.metrics" :cluster="cluster" />
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
