<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
const { field, monospace = false } = defineProps<{
  field: string | number
  monospace?: boolean
}>()
</script>

<template>
  <dd
    :class="[
      monospace ? 'font-mono' : '',
      'mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300'
    ]"
  >
    {{ field }}
  </dd>
</template>
