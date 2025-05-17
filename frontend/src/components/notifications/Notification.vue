<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import { useRuntimeStore } from '@/stores/runtime'
import type { Notification } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()

const { notification } = defineProps<{ notification: Notification }>()
</script>

<template>
  <div
    class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-700 dark:shadow-gray-100/20"
    style="margin-top: 50"
  >
    <div class="flex items-start p-4">
      <div class="shrink-0">
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
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ notification.type }}</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-200">{{ notification.message }}</p>
      </div>
      <div class="ml-4 flex shrink-0">
        <button
          type="button"
          @click="runtimeStore.removeNotification(notification)"
          class="focus:ring-slurmweb inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-offset-2 focus:outline-hidden dark:bg-gray-700 hover:dark:text-gray-100"
        >
          <span class="sr-only">Close</span>
          <XMarkIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
