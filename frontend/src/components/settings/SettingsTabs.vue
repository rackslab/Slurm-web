<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { RouterLink } from 'vue-router'

const { entry } = defineProps<{ entry: string }>()
const tabs = [
  { name: 'General', href: 'settings' },
  { name: 'Errors', href: 'settings-errors' },
  { name: 'Account', href: 'settings-account' },
  { name: 'Cache', href: 'settings-cache' }
]
</script>
<template>
  <div class="border-b border-gray-200 dark:border-gray-700">
    <div class="sm:flex sm:items-baseline">
      <h3 class="text-base leading-6 font-semibold text-gray-900 dark:text-gray-100">Settings</h3>
      <div class="mt-4 sm:mt-0 sm:ml-10">
        <nav class="-mb-px flex space-x-8">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.name"
            :to="{ name: tab.href }"
            :class="[
              entry == tab.name
                ? 'border-slurmweb-dark text-slurmweb-dark dark:border-slurmweb dark:text-slurmweb'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 hover:dark:text-gray-100',
              'border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap'
            ]"
            :aria-current="entry == tab.name ? 'page' : undefined"
            >{{ tab.name }}</RouterLink
          >
        </nav>
      </div>
    </div>
  </div>
</template>
