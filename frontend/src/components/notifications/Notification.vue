<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { PropType } from 'vue'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import { useRuntimeStore } from '@/stores/runtime'
import type { Notification } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()

const props = defineProps({
  notification: {
    type: Object as PropType<Notification>,
    required: true
  }
})
</script>

<template>
  <div
    class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
    style="margin-top: 50"
  >
    <div class="flex items-start p-4">
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
</template>
