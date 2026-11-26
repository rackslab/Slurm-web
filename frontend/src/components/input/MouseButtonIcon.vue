<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
/* Icon of a mouse with the given button highlighted. */
const { button } = defineProps<{
  button: 'left' | 'right' | 'wheel'
}>()
</script>

<template>
  <svg
    viewBox="0 0 14 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.2"
    stroke-linejoin="round"
    aria-hidden="true"
    class="h-4 w-3"
    :data-button="button"
  >
    <path d="M7 1.5V8M1.5 8h11" stroke-linecap="round" />
    <path
      v-if="button === 'left'"
      d="M7 1.5H6.5A5 5 0 0 0 1.5 6.5V8H7Z"
      fill="currentColor"
      class="text-slurmweb dark:text-slurmweb-light"
      stroke="none"
    />
    <path
      v-if="button === 'right'"
      d="M7 1.5H7.5A5 5 0 0 1 12.5 6.5V8H7Z"
      fill="currentColor"
      class="text-slurmweb dark:text-slurmweb-light"
      stroke="none"
    />
    <rect x="1.5" y="1.5" width="11" height="17" rx="5.5" />
    <rect
      x="5.8"
      y="3.5"
      width="2.4"
      height="3.5"
      rx="1.2"
      :fill="button === 'wheel' ? 'currentColor' : 'none'"
      :class="button === 'wheel' ? 'text-slurmweb dark:text-slurmweb-light' : ''"
    />
  </svg>
</template>
