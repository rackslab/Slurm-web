<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { resourcesDiagramRouteName } from '@/stores/runtime/resources'
import type { ResourcesLayout, ResourcesRepresentation } from '@/stores/runtime/resources'

const {
  cluster,
  currentView,
  layout = '2d'
} = defineProps<{
  cluster: string
  currentView: ResourcesRepresentation
  layout?: ResourcesLayout
}>()

const router = useRouter()
const runtimeStore = useRuntimeStore()

/* Navigate to diagram with the given layout and representation, keeping
 * filters. */
function navigate(targetLayout: ResourcesLayout, representation: ResourcesRepresentation) {
  router.push({
    name: resourcesDiagramRouteName(targetLayout, representation),
    params: { cluster },
    query: runtimeStore.resources.query() as LocationQueryRaw
  })
}

function switchTo(representation: ResourcesRepresentation) {
  navigate(layout, representation)
}

function switchLayout(targetLayout: ResourcesLayout) {
  navigate(targetLayout, currentView)
}

const buttonClasses =
  'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
const activeClasses = 'bg-slurmweb dark:bg-slurmweb-dark text-white'
const inactiveClasses =
  'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700'
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <span class="isolate inline-flex rounded-md shadow-xs">
      <button
        type="button"
        data-testid="resources-diagram-layout-2d"
        :class="[layout === '2d' ? activeClasses : inactiveClasses, buttonClasses, 'rounded-l-md']"
        @click="switchLayout('2d')"
      >
        2D
      </button>
      <button
        type="button"
        data-testid="resources-diagram-layout-3d"
        :class="[layout === '3d' ? activeClasses : inactiveClasses, buttonClasses, 'rounded-r-md']"
        @click="switchLayout('3d')"
      >
        3D
      </button>
    </span>
    <span class="isolate inline-flex rounded-md shadow-xs">
      <button
        type="button"
        data-testid="resources-diagram-mode-nodes"
        :class="[
          currentView === 'nodes' ? activeClasses : inactiveClasses,
          buttonClasses,
          'rounded-l-md'
        ]"
        @click="switchTo('nodes')"
      >
        Nodes
      </button>
      <button
        type="button"
        data-testid="resources-diagram-mode-cores"
        :class="[
          currentView === 'cores' ? activeClasses : inactiveClasses,
          buttonClasses,
          'rounded-r-md'
        ]"
        @click="switchTo('cores')"
      >
        Cores
      </button>
    </span>
  </div>
</template>
