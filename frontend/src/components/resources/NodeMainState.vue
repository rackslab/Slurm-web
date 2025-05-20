<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
import { getNodeMainState } from '@/composables/GatewayAPI'
import {
  BookmarkIcon,
  ArrowRightEndOnRectangleIcon,
  CloudIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  WrenchScrewdriverIcon,
  Battery50Icon,
  Battery0Icon,
  CubeTransparentIcon,
  ShieldExclamationIcon
} from '@heroicons/vue/16/solid'

const { status } = defineProps<{ status: string[] }>()

interface NodeMainLabelColors {
  span: string
  label: string
  circle: string
}

const nodeTagsIconsMap = {
  /* Note that:
   * - FAIL and DRAIN are managed in main state
   * - PLANNED is managed in NodeAllocationState
   * - flag REBOOT_CANCELED is only used in RPC
   */
  RESERVED: BookmarkIcon,
  UNDRAIN: ArrowTrendingUpIcon,
  CLOUD: CloudIcon,
  COMPLETING: ArrowRightEndOnRectangleIcon,
  NOT_RESPONDING: SignalSlashIcon,
  POWERED_DOWN: Battery0Icon,
  POWERING_UP: BoltIcon,
  MAINTENANCE: WrenchScrewdriverIcon,
  REBOOT_REQUESTED: ArrowPathIcon,
  POWERING_DOWN: Battery50Icon,
  DYNAMIC_FUTURE: CubeTransparentIcon,
  REBOOT_ISSUED: ArrowPathIcon,
  INVALID_REG: ShieldExclamationIcon,
  POWER_DOWN: Battery0Icon,
  POWER_UP: BoltIcon,
  POWER_DRAIN: Battery0Icon,
  DYNAMIC_NORM: CubeTransparentIcon
}

const nodeTagsIcons = computed(() => {
  const result = []
  for (const [flag, icon] of Object.entries(nodeTagsIconsMap))
    if (status.includes(flag)) result.push(icon)
  return result
})

const nodeMainLabelColors = computed<NodeMainLabelColors>(() => {
  switch (getNodeMainState(status)) {
    case 'down':
      return {
        span: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-100',
        label: 'down',
        circle: 'fill-red-600'
      }
    case 'error':
      return {
        span: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-100',
        label: 'error',
        circle: 'fill-red-600'
      }
    case 'fail':
      return {
        span: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-100',
        label: 'fail',
        circle: 'fill-red-600'
      }
    case 'failing':
      return {
        span: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-100',
        label: 'failing',
        circle: 'fill-red-600'
      }
    case 'drain':
      return {
        span: 'bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-700 dark:text-fuchsia-100',
        label: 'drain',
        circle: 'fill-fuchsia-700'
      }
    case 'draining':
      return {
        span: 'bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-700 dark:text-fuchsia-100',
        label: 'draining',
        circle: 'fill-fuchsia-300'
      }
    case 'future':
      return {
        span: 'bg-gray-100 dark:bg-gray-900/60 text-gray-700 dark:text-gray-100',
        label: 'future',
        circle: 'fill-gray-300'
      }
    default:
      return {
        span: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-200',
        label: 'up',
        circle: 'fill-green-500 dark:fill-green-700'
      }
  }
})
</script>

<template>
  <span
    v-if="nodeMainLabelColors"
    :class="[
      'max-h-6 text-xs',
      'inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium',
      nodeMainLabelColors.span
    ]"
  >
    <svg :class="['h-1.5 w-1.5', nodeMainLabelColors.circle]" viewBox="0 0 6 6" aria-hidden="true">
      <circle cx="3" cy="3" r="3" />
    </svg>
    {{ nodeMainLabelColors.label.toUpperCase() }}
    <template v-for="icon in nodeTagsIcons" :key="icon"
      ><component :is="icon" class="size-4"
    /></template>
  </span>
</template>
