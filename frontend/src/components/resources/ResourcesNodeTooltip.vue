<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import type { ResourcesRepresentation } from '@/stores/runtime/resources'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'

const { node, mode } = defineProps<{
  node: SlurmNode
  mode?: ResourcesRepresentation
}>()
</script>

<template>
  <div class="w-40 overflow-hidden rounded-md bg-white shadow-lg dark:bg-gray-800">
    <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
      <li class="bg-gray-200 py-2 text-center text-sm dark:bg-gray-700 dark:text-gray-100">
        <strong>Node {{ node.name }}</strong>
      </li>
      <li class="flex px-4 py-1 text-xs text-gray-400 dark:text-gray-200">
        <NodeMainState :status="node.state" />
      </li>
      <li class="flex justify-between px-4 py-1 text-xs text-gray-400 dark:text-gray-200">
        <NodeAllocationState :status="node.state" />
        <span v-if="mode === 'cores'" class="text-right text-xs text-gray-400 dark:text-gray-200">
          {{ node.alloc_cpus }}/{{ node.cpus }}
        </span>
      </li>
    </ul>
  </div>
</template>
