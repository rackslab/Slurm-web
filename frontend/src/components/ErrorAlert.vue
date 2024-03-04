<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { XCircleIcon } from '@heroicons/vue/20/solid'
</script>

<template>
  <div class="rounded-md bg-red-50 p-4">
    <div class="flex">
      <div class="flex-shrink-0">
        <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
      </div>
      <div class="ml-3 flex-1 md:flex md:justify-between">
        <p class="text-sm text-red-700"><slot></slot></p>
        <p class="mt-3 text-sm md:ml-6 md:mt-0">
          <RouterLink
            :to="{ name: 'settings-errors' }"
            class="whitespace-nowrap font-medium text-red-700 hover:text-red-600"
          >
            See Errors
            <span aria-hidden="true"> &rarr;</span>
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
