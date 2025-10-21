<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import type { ClusterNode } from '@/composables/GatewayAPI'

const { cluster, nodes, loading } = defineProps<{
  cluster: string
  nodes: ClusterNode[]
  loading?: boolean
}>()

const fullscreenButton = useTemplateRef<HTMLDivElement>('fullscreenButton')
const displayFullscreenButton: Ref<boolean> = ref(false)
const unable = ref(false)
const router = useRouter()

function toggleFullScreen() {
  router.push({ name: 'resources-diagram-nodes', params: { cluster } })
}

function positionFullscreenButton(x_shift: number, canvas_width: number) {
  if (fullscreenButton.value) {
    fullscreenButton.value.style.left = (x_shift + canvas_width).toString() + 'px'
  }
}

function mouseOverThumbnail() {
  if (!unable.value) displayFullscreenButton.value = true
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
      class="absolute top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
    >
      <span class="sr-only">fullscreen</span>
      <ArrowsPointingOutIcon class="h-6 w-6" aria-hidden="true" />
    </button>
    <ResourcesCanvas
      :cluster="cluster"
      :nodes="nodes"
      :fullscreen="false"
      :loading="loading"
      @image-size="positionFullscreenButton"
      v-model="unable"
    />
  </div>
</template>
