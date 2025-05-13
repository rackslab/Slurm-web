<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getNodeGPU } from '@/composables/GatewayAPI'
import type { ClusterNode } from '@/composables/GatewayAPI'

const { node } = defineProps<{
  node: ClusterNode
}>()
const nodeGPU = getNodeGPU(node.gres)
</script>

<template>
  <span v-if="nodeGPU.length" class="text-gray-500">
    {{ nodeGPU.join(', ') }}
  </span>
  <span v-else class="text-gray-400">-</span>
</template>
