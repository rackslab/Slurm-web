<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-base leading-6 font-semibold text-gray-900 dark:text-gray-100">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 text-sm text-gray-700 dark:text-gray-300">
        {{ description }}
      </p>
    </div>
  </div>
</template>
