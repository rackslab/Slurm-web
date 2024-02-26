<script setup lang="ts">
import { ref } from 'vue'
import type { PropType, Ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import type { ClusterNode } from '@/composables/GatewayAPI'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  },
  nodes: {
    type: Array as PropType<ClusterNode[]>,
    required: true
  }
})

const fullscreen: Ref<boolean> = ref(false)
const fullscreenButton: Ref<HTMLDivElement | null> = ref(null)
const displayFullscreenButton: Ref<boolean> = ref(false)

function toggleFullScreen() {
  fullscreen.value = !fullscreen.value
}

function positionFullscreenButton(x_shift: number, canvas_width: number) {
  if (fullscreenButton.value) {
    fullscreenButton.value.style.left = (x_shift + canvas_width).toString() + 'px'
  }
}
</script>

<template>
  <div
    v-if="!fullscreen"
    @mouseover="displayFullscreenButton = true"
    @mouseleave="displayFullscreenButton = false"
    class="relative"
  >
    <button
      v-show="displayFullscreenButton"
      ref="fullscreenButton"
      @click="toggleFullScreen()"
      class="absolute top-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 rounded-lg"
    >
      <span class="sr-only">fullscreen</span>
      <ArrowsPointingOutIcon class="h-6 w-6" aria-hidden="true" />
    </button>
    <ResourcesCanvas
      :cluster="props.cluster"
      :nodes="props.nodes"
      :fullscreen="fullscreen"
      @image-size="positionFullscreenButton"
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
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
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
              class="relative transform overflow-hidden bg-white px-4 text-left shadow-xl transition-all min-w-full min-h-screen"
            >
              <div class="absolute right-0 top-0 z-50 pr-4 pt-4 sm:block">
                <button
                  type="button"
                  class="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  @click="toggleFullScreen()"
                >
                  <span class="sr-only">Close</span>
                  <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div
                class="flex flex-col relative mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left min-h-screen"
              >
                <DialogTitle
                  as="h3"
                  class="flex text-base font-semibold leading-6 text-gray-900 p-6"
                  >Cluster {{ props.cluster }}</DialogTitle
                >
                <ResourcesCanvas
                  :cluster="props.cluster"
                  :nodes="props.nodes"
                  :fullscreen="fullscreen"
                />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
