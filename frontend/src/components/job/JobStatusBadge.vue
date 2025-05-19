<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowDownOnSquareIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowsPointingOutIcon,
  Cog8ToothIcon,
  ArrowPathRoundedSquareIcon,
  LockClosedIcon,
  StopCircleIcon,
  BellAlertIcon,
  EyeSlashIcon,
  FolderMinusIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/16/solid'

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
  if (status.includes('PENDING'))
    return {
      span: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-100',
      circle: 'fill-yellow-500'
    }
  else if (status.includes('RUNNING'))
    return {
      span: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-200',
      circle: 'fill-green-500 dark:fill-green-700'
    }
  else if (status.includes('SUSPENDED'))
    return {
      span: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-100',
      circle: 'fill-purple-500'
    }
  else if (status.includes('COMPLETED'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-green-500'
    }
  else if (status.includes('CANCELLED'))
    return {
      span: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-100',
      circle: 'fill-purple-500'
    }
  else if (status.includes('FAILED'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-red-500'
    }
  else if (status.includes('TIMEOUT'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-orange-600'
    }
  else if (status.includes('NODE_FAIL'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-red-500'
    }
  else if (status.includes('PREEMPTED'))
    return {
      span: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-100',
      circle: 'fill-purple-500'
    }
  else if (status.includes('BOOT_FAIL'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-red-500'
    }
  else if (status.includes('DEADLINE'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-red-500'
    }
  else if (status.includes('OUT_OF_MEMORY'))
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-red-500'
    }
  else
    return {
      span: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      circle: 'fill-gray-400'
    }
})

/*
  This must be kept in sync with logic implemented in Slurm job_state_string():
  https://github.com/SchedMD/slurm/blob/master/src/common/slurm_protocol_defs.c
*/

const mainStatus = computed<string>(() => {
  if (status.includes('PENDING')) return 'PENDING'
  else if (status.includes('RUNNING')) return 'RUNNING'
  else if (status.includes('SUSPENDED')) return 'SUSPENDED'
  else if (status.includes('COMPLETED')) return 'COMPLETED'
  else if (status.includes('CANCELLED')) return 'CANCELLED'
  else if (status.includes('FAILED')) return 'FAILED'
  else if (status.includes('TIMEOUT')) return 'TIMEOUT'
  else if (status.includes('NODE_FAIL')) return 'NODE FAIL'
  else if (status.includes('PREEMPTED')) return 'PREEMPTED'
  else if (status.includes('BOOT_FAIL')) return 'BOOT FAIL'
  else if (status.includes('DEADLINE')) return 'DEADLINE'
  else if (status.includes('OUT_OF_MEMORY')) return 'OUT OF MEMORY'
  throw new Error('Unable to determine main job status: ' + status)
})

const stateFlagsIcons = computed(() => {
  let result = []
  const flag_icons = {
    COMPLETING: ArrowDownOnSquareIcon,
    STAGE_OUT: ArrowRightStartOnRectangleIcon,
    CONFIGURING: Cog8ToothIcon,
    RESIZING: ArrowsPointingOutIcon,
    REQUEUD: ArrowPathRoundedSquareIcon,
    REQUEUE_FED: ArrowPathRoundedSquareIcon,
    REQUEUE_HOLD: LockClosedIcon,
    SPECIAL_EXIT: ExclamationTriangleIcon,
    STOPPED: StopCircleIcon,
    REVOKED: EyeSlashIcon,
    RESV_DEL_HOLD: FolderMinusIcon,
    SIGNALING: BellAlertIcon
  }
  for (const [flag, icon] of Object.entries(flag_icons)) {
    if (status.includes(flag)) result.push(icon)
  }
  return result
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
    <template v-for="icon in stateFlagsIcons"><component :is="icon" class="size-4"/></template>
  </span>
</template>
