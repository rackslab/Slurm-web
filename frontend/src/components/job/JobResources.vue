<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { jobResourcesTRES, getMBHumanUnit } from '@/composables/GatewayAPI'
import type { ClusterTRES } from '@/composables/GatewayAPI'
import {
  ServerIcon,
  CpuChipIcon,
  TableCellsIcon,
  Square3Stack3DIcon
} from '@heroicons/vue/24/outline'

const { tres, gpu } = defineProps<{
  tres: ClusterTRES[]
  gpu: { count: number; reliable: boolean }
}>()
const resources = jobResourcesTRES(tres)
</script>

<template>
  <span v-if="resources.node == -1 && resources.cpu == -1 && resources.memory == -1">∅</span>
  <dd v-else class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
    <ul>
      <li>
        <span class="inline-flex"
          ><ServerIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />Nodes: {{ resources.node }}</span
        >
      </li>
      <li>
        <span class="inline-flex"
          ><CpuChipIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />CPU: {{ resources.cpu }}</span
        >
      </li>
      <li>
        <span class="inline-flex"
          ><TableCellsIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />Memory:
          {{ getMBHumanUnit(resources.memory) }}</span
        >
      </li>
      <li v-if="gpu.count > 0">
        <span class="inline-flex"
          ><Square3Stack3DIcon class="mr-0.5 h-5 w-5" aria-hidden="true" /> GPU: {{ gpu.count }}
          <span v-if="!gpu.reliable" class="text-gray-400">~</span></span
        >
      </li>
    </ul>
  </dd>
</template>
