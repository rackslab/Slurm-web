<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { useRuntimeStore } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()
</script>

<template>
  <div>
    <input
      id="job-name-filter"
      v-model="runtimeStore.jobs.filters.name"
      type="text"
      autocomplete="off"
      placeholder="Filter by name…"
      class="focus:ring-slurmweb w-full rounded-md border-0 bg-white py-1.5 pl-3 shadow-xs ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700"
    />
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Plain text matches substrings. Use
      <code class="text-gray-600 dark:text-gray-300">/pattern/</code> for regular expressions
      (optional flags, e.g. <code class="text-gray-600 dark:text-gray-300">/bench/i</code>).
    </p>
  </div>
</template>
