<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { nodeGPULabelsFromGRES } from '@/composables/gateway/slurm/node'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

const { node } = defineProps<{
  node: SlurmNode
}>()
const gpuLabels = nodeGPULabelsFromGRES(node.gres)
</script>

<template>
  <span v-if="gpuLabels.length" class="text-gray-500">
    {{ gpuLabels.join(', ') }}
  </span>
  <span v-else class="text-gray-400">-</span>
</template>
