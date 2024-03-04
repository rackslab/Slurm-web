<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
const props = defineProps({
  status: String,
  large: {
    type: Boolean,
    default: false
  }
})

interface JobLabelColors {
  span: string
  circle: string
}

function getStatusColor(status: string): JobLabelColors {
  switch (status) {
    case 'RUNNING':
      return {
        span: 'bg-green-100 text-green-700',
        circle: 'fill-green-500'
      }
    case 'PENDING':
      return {
        span: 'bg-yellow-100 text-yellow-800',
        circle: 'fill-yellow-500'
      }
    default:
      return {
        span: 'bg-gray-100 text-gray-600',
        circle: 'fill-gray-400'
      }
  }
}
</script>

<template>
  <span
    :class="[
      props.large ? 'max-h-10 text-sm' : 'max-h-6 text-xs',
      'inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium',
      getStatusColor(props.status as string).span
    ]"
  >
    <svg
      :class="['h-1.5 w-1.5', getStatusColor(props.status as string).circle]"
      viewBox="0 0 6 6"
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
    {{ props.status }}
  </span>
</template>
