<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'

const {
  status,
  large = false,
  label
} = defineProps<{
  status: string[]
  large?: boolean
  label?: string
}>()

interface JobLabelColors {
  span: string
  circle: string
}

const statusColor = computed<JobLabelColors>(() => {
  if (status.includes('RUNNING'))
    return {
      span: 'bg-green-100 text-green-700',
      circle: 'fill-green-500'
    }
  else if (status.includes('PENDING'))
    return {
      span: 'bg-yellow-100 text-yellow-800',
      circle: 'fill-yellow-500'
    }
  else if (status.includes('CANCELLED'))
    return {
      span: 'bg-purple-100 text-purple-700',
      circle: 'fill-purple-500'
    }
  else if (status.includes('COMPLETED'))
    return {
      span: 'bg-gray-100 text-gray-600',
      circle: 'fill-green-500'
    }
  else if (status.includes('FAILED'))
    return {
      span: 'bg-gray-100 text-gray-600',
      circle: 'fill-red-500'
    }
  else if (status.includes('TIMEOUT'))
    return {
      span: 'bg-gray-100 text-gray-600',
      circle: 'fill-orange-600'
    }
  else
    return {
      span: 'bg-gray-100 text-gray-600',
      circle: 'fill-gray-400'
    }
})

const mainStatus = computed<string>(() => {
  if (status.includes('RUNNING')) return 'RUNNING'
  else if (status.includes('PENDING')) return 'PENDING'
  else if (status.includes('CANCELLED')) return 'CANCELLED'
  else if (status.includes('COMPLETED')) return 'COMPLETED'
  else return status[0] as string
})
</script>

<template>
  <span
    :class="[
      large ? 'max-h-10 text-sm' : 'max-h-6 text-xs',
      'inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium',
      statusColor.span
    ]"
  >
    <svg :class="['h-1.5 w-1.5', statusColor.circle]" viewBox="0 0 6 6" aria-hidden="true">
      <circle cx="3" cy="3" r="3" />
    </svg>
    <template v-if="label">
      {{ label }}
    </template>
    <template v-else>
      {{ mainStatus }}
    </template>
  </span>
</template>
