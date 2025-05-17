<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { getNodeMainState } from '@/composables/GatewayAPI'
import type { ClusterNode } from '@/composables/GatewayAPI'

const { node } = defineProps<{ node: ClusterNode }>()

interface NodeMainLabelColors {
  span: string
  label: string
  circle: string
}

const nodeMainLabelColors: Ref<NodeMainLabelColors | undefined> = ref()

function getStatusColor(): NodeMainLabelColors {
  switch (getNodeMainState(node)) {
    case 'down':
      return {
        span: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-100',
        label: 'down',
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
    default:
      return {
        span: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-200',
        label: 'up',
        circle: 'fill-green-500 dark:fill-green-700'
      }
  }
}
watch(
  () => node,
  () => {
    nodeMainLabelColors.value = getStatusColor()
  }
)
onMounted(() => {
  nodeMainLabelColors.value = getStatusColor()
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
  </span>
</template>
