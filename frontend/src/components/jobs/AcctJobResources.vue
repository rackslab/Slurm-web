<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import type { SlurmAcctJob } from '@/composables/gateway/slurm/types'
import {
  acctJobAllocatedGPU,
  acctJobCPUs,
  acctJobResources
} from '@/composables/gateway/slurm/acctJob'
import { ServerIcon, CpuChipIcon, Square3Stack3DIcon } from '@heroicons/vue/24/outline'

const { job } = defineProps<{ job: SlurmAcctJob }>()
const jobResources = acctJobResources(job)
const gpu = acctJobAllocatedGPU(job)
const nodes = jobResources.node >= 0 ? jobResources.node : 0
const jobCpus = acctJobCPUs(job)
</script>
<template>
  <span class="mr-2 inline-flex">
    <ServerIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ nodes }}
  </span>
  <span class="mr-2 inline-flex">
    <CpuChipIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ jobCpus }}
  </span>
  <span v-if="gpu > 0" class="inline-flex">
    <Square3Stack3DIcon class="mr-0.5 h-5 w-5" aria-hidden="true" />
    {{ gpu }}
  </span>
</template>
