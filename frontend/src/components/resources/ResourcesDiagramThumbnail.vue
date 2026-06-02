<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import type { ResourcesRepresentation } from '@/stores/runtime/resources'
import { useRuntimeStore } from '@/stores/runtime'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

const { cluster, nodes, loading, mode } = defineProps<{
  cluster: string
  nodes: SlurmNode[]
  loading?: boolean
  mode?: ResourcesRepresentation
}>()

const fullscreenButton = useTemplateRef<HTMLDivElement>('fullscreenButton')
const displayFullscreenButton: Ref<boolean> = ref(false)
const unable = ref(false)
const router = useRouter()
const runtimeStore = useRuntimeStore()
const currentMode = computed<ResourcesRepresentation>(() => mode ?? 'nodes')

function toggleFullScreen() {
  router.push({
    name: mode === 'cores' ? 'resources-diagram-cores' : 'resources-diagram-nodes',
    params: { cluster }
  })
}

function positionFullscreenButton(x_shift: number, canvas_width: number) {
  if (fullscreenButton.value) {
    fullscreenButton.value.style.left = (x_shift + canvas_width).toString() + 'px'
  }
}

function mouseOverThumbnail() {
  if (!unable.value) displayFullscreenButton.value = true
}

function updateMode(newMode: ResourcesRepresentation) {
  runtimeStore.resources.representation = newMode
}
</script>

<template>
  <div
    @mouseover="mouseOverThumbnail()"
    @mouseleave="displayFullscreenButton = false"
    class="relative"
  >
    <button
      v-show="displayFullscreenButton"
      ref="fullscreenButton"
      @click="toggleFullScreen()"
      data-testid="resources-thumbnail-fullscreen"
      class="absolute top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
    >
      <span class="sr-only">fullscreen</span>
      <ArrowsPointingOutIcon class="h-6 w-6" aria-hidden="true" />
    </button>
    <span
      v-show="displayFullscreenButton"
      class="absolute top-4 left-1/2 isolate inline-flex -translate-x-1/2 rounded-md shadow-xs"
      data-testid="resources-thumbnail-mode-switch"
    >
      <button
        type="button"
        :class="[
          currentMode === 'nodes'
            ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
            : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
          'relative inline-flex items-center rounded-l-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
        ]"
        data-testid="resources-thumbnail-mode-nodes"
        @click="updateMode('nodes')"
      >
        Nodes
      </button>
      <button
        type="button"
        :class="[
          currentMode === 'cores'
            ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
            : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
          'relative inline-flex items-center rounded-r-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
        ]"
        data-testid="resources-thumbnail-mode-cores"
        @click="updateMode('cores')"
      >
        Cores
      </button>
    </span>
    <ResourcesCanvas
      :cluster="cluster"
      :nodes="nodes"
      :fullscreen="false"
      :mode="mode"
      :loading="loading"
      @image-size="positionFullscreenButton"
      v-model="unable"
    />
  </div>
</template>
