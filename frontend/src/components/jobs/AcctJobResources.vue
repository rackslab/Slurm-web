<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import type { ClusterAcctJob } from '@/composables/GatewayAPI'
import {
  acctJobAllocatedGPU,
  acctJobCpus,
  acctJobResources
} from '@/composables/GatewayAPI'
import { ServerIcon, CpuChipIcon, Square3Stack3DIcon } from '@heroicons/vue/24/outline'

const { job } = defineProps<{ job: ClusterAcctJob }>()
const resources = acctJobResources(job)
const gpu = acctJobAllocatedGPU(job)
const nodes = resources.node >= 0 ? resources.node : 0
const cpus = acctJobCpus(job)
</script>
<template>
  <span class="mr-2 inline-flex">
    <ServerIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ nodes }}
  </span>
  <span class="mr-2 inline-flex">
    <CpuChipIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ cpus }}
  </span>
  <span v-if="gpu > 0" class="inline-flex">
    <Square3Stack3DIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ gpu }}
  </span>
</template>
