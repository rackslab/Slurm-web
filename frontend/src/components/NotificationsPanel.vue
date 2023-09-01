<script setup lang="ts">
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import { useRuntimeStore } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()
</script>

<template>
  <!-- Global notification live region, render this permanently at the end of the document 
  class="pointer-events-none fixed inset-0 flex flex-col items-end px-4 py-6 sm:items-start sm:p-6"-->
  <div aria-live="assertive" class="absolute top-2 right-4 w-96 flex flex-col space-y-4 z-50">
    <!-- Notification panel, dynamically insert this into the live region when it needs to be displayed -->
    <TransitionGroup
      move-class="transition-all ease-in-out duration-500"
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="absolute transition ease-in duration-100 w-96"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-4"
    >
      <div v-for="notification in runtimeStore.notifications" :key="notification.id">
        <div
          class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
          style="margin-top: 50"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <CheckCircleIcon
                  v-if="notification.type == 'INFO'"
                  class="h-6 w-6 text-green-700"
                  aria-hidden="true"
                />
                <XCircleIcon
                  v-else-if="notification.type == 'ERROR'"
                  class="h-6 w-6 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-gray-900">{{ notification.type }}</p>
                <p class="mt-1 text-sm text-gray-500">{{ notification.message }}</p>
              </div>
              <div class="ml-4 flex flex-shrink-0">
                <button
                  type="button"
                  @click="runtimeStore.removeNotification(notification)"
                  class="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slurmweb focus:ring-offset-2"
                >
                  <span class="sr-only">Close</span>
                  <XMarkIcon class="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
