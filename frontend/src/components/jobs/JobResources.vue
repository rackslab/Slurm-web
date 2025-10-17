<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { jobResourcesGPU } from '@/composables/GatewayAPI'
import type { ClusterJob } from '@/composables/GatewayAPI'
import { ServerIcon, CpuChipIcon, Square3Stack3DIcon } from '@heroicons/vue/24/outline'

const { job } = defineProps<{ job: ClusterJob }>()
const gpu = jobResourcesGPU(job)
</script>
<template>
  <span class="mr-2 inline-flex">
    <ServerIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ job.node_count.number }}
  </span>
  <span class="mr-2 inline-flex">
    <CpuChipIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ job.cpus.number }}
  </span>
  <span v-if="gpu.count" class="inline-flex">
    <Square3Stack3DIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ gpu.count }}
    <span v-if="!gpu.reliable" class="text-gray-400">~</span>
  </span>
</template>
