<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import type { ResourcesRepresentation } from '@/stores/runtime/resources'

const { cluster, currentView } = defineProps<{
  cluster: string
  currentView: ResourcesRepresentation
}>()

const router = useRouter()
const runtimeStore = useRuntimeStore()

function switchToNodes() {
  router.push({
    name: 'resources-diagram-nodes',
    params: { cluster },
    query: runtimeStore.resources.query() as LocationQueryRaw
  })
}

function switchToCores() {
  router.push({
    name: 'resources-diagram-cores',
    params: { cluster },
    query: runtimeStore.resources.query() as LocationQueryRaw
  })
}

const segmentButton =
  'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
const segmentActive = 'bg-slurmweb dark:bg-slurmweb-dark text-white'
const segmentIdle =
  'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700'
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <div
      v-if="runtimeStore.resources.layout === '3d'"
      id="resources-diagram-camera-controls"
      data-testid="resources-diagram-camera-controls"
    />
    <span class="isolate inline-flex rounded-md shadow-xs">
      <button
        type="button"
        data-testid="resources-diagram-layout-2d"
        :class="[
          runtimeStore.resources.layout === '2d' ? segmentActive : segmentIdle,
          segmentButton,
          'rounded-l-md'
        ]"
        @click="runtimeStore.resources.layout = '2d'"
      >
        2D
      </button>
      <button
        type="button"
        data-testid="resources-diagram-layout-3d"
        :class="[
          runtimeStore.resources.layout === '3d' ? segmentActive : segmentIdle,
          segmentButton,
          'rounded-r-md'
        ]"
        @click="runtimeStore.resources.layout = '3d'"
      >
        3D
      </button>
    </span>
    <span class="isolate inline-flex rounded-md shadow-xs">
      <button
        type="button"
        data-testid="resources-diagram-mode-nodes"
        :class="[
          currentView === 'nodes' ? segmentActive : segmentIdle,
          segmentButton,
          'rounded-l-md'
        ]"
        @click="switchToNodes"
      >
        Nodes
      </button>
      <button
        type="button"
        data-testid="resources-diagram-mode-cores"
        :class="[
          currentView === 'cores' ? segmentActive : segmentIdle,
          segmentButton,
          'rounded-r-md'
        ]"
        @click="switchToCores"
      >
        Cores
      </button>
    </span>
  </div>
</template>
