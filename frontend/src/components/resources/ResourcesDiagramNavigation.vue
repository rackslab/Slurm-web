<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'

const { cluster, currentView } = defineProps<{
  cluster: string
  currentView: 'nodes' | 'cores'
}>()

const router = useRouter()

function switchToNodes() {
  router.push({ name: 'resources-diagram-nodes', params: { cluster } })
}

function switchToCores() {
  router.push({ name: 'resources-diagram-cores', params: { cluster } })
}
</script>

<template>
  <div class="flex justify-center">
    <span class="isolate inline-flex rounded-md shadow-xs">
      <button
        type="button"
        :class="[
          currentView === 'nodes'
            ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
            : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
          'relative inline-flex items-center rounded-l-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
        ]"
        @click="switchToNodes"
      >
        Nodes
      </button>
      <button
        type="button"
        :class="[
          currentView === 'cores'
            ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
            : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
          'relative inline-flex items-center rounded-r-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
        ]"
        @click="switchToCores"
      >
        Cores
      </button>
    </span>
  </div>
</template>
