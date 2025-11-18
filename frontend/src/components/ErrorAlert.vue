<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { XCircleIcon } from '@heroicons/vue/20/solid'

const { showErrorsLink = true } = defineProps<{ showErrorsLink?: boolean }>()
</script>

<template>
  <div class="rounded-md bg-red-50 p-4 dark:bg-red-950">
    <div class="flex">
      <div class="shrink-0">
        <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
      </div>
      <div class="ml-3 flex-1 md:flex md:justify-between">
        <p class="text-sm text-red-700 dark:text-red-400"><slot></slot></p>
        <p v-if="showErrorsLink" class="mt-3 text-sm md:mt-0 md:ml-6">
          <RouterLink
            :to="{ name: 'settings-errors' }"
            class="font-medium whitespace-nowrap text-red-700 hover:text-red-600 dark:text-red-400 hover:dark:text-red-300"
          >
            See Errors
            <span aria-hidden="true"> &rarr;</span>
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
