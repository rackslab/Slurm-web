<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
/* Keyboard key, styled like a keycap. */
const { small = false } = defineProps<{
  small?: boolean
}>()
</script>

<template>
  <kbd
    :class="[
      small ? 'h-3.5 min-w-3.5 text-[8px]' : 'h-5 min-w-5 px-1 text-[10px]',
      'inline-flex items-center justify-center rounded-[3px] border border-b-2 border-gray-300 bg-white font-sans font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
    ]"
  >
    <slot />
  </kbd>
</template>
