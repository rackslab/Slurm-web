<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import type { ClusterNode } from '@/composables/GatewayAPI'

const { cluster, nodes } = defineProps<{
  cluster: string
  nodes: ClusterNode[]
}>()

const fullscreen: Ref<boolean> = ref(false)
const fullscreenButton = useTemplateRef<HTMLDivElement>('fullscreenButton')
const displayFullscreenButton: Ref<boolean> = ref(false)
const unable = ref(false)

function toggleFullScreen() {
  fullscreen.value = !fullscreen.value
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
    v-if="!fullscreen"
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
      :fullscreen="fullscreen"
      @image-size="positionFullscreenButton"
      v-model="unable"
    />
  </div>

  <TransitionRoot as="template" :show="fullscreen">
    <Dialog as="div" class="relative z-50" @close="toggleFullScreen()">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center text-center sm:items-center">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative min-h-screen min-w-full transform overflow-hidden bg-white px-4 text-left shadow-xl transition-all dark:bg-gray-900"
            >
              <div class="absolute top-0 right-0 z-50 pt-4 pr-4 sm:block">
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
                  @click="toggleFullScreen()"
                >
                  <span class="sr-only">Close</span>
                  <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div
                class="relative mt-3 flex min-h-screen flex-col text-center sm:mt-0 sm:ml-4 sm:text-left"
              >
                <DialogTitle
                  as="h3"
                  class="flex p-6 text-base leading-6 font-semibold text-gray-900 dark:text-gray-100"
                  >Cluster {{ cluster }}</DialogTitle
                >
                <ResourcesCanvas
                  :cluster="cluster"
                  :nodes="nodes"
                  :fullscreen="fullscreen"
                  v-model="unable"
                />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
