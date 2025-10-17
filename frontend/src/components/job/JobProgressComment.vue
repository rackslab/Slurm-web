<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import { StopCircleIcon } from '@heroicons/vue/24/outline'

const { job, step } = defineProps<{
  job: ClusterIndividualJob
  step: string
}>()
</script>

<template>
  <span class="text-sm text-gray-500 dark:text-gray-300">
    <template v-if="step == 'submitted'">
      {{ new Date(job.time.submission * 1000).toLocaleString() }}
    </template>
    <template v-else-if="step == 'eligible'">
      {{ new Date(job.time.eligible * 1000).toLocaleString() }}
    </template>
    <template v-else-if="step == 'scheduling' && job.time.start">
      {{ new Date(job.time.start * 1000).toLocaleString() }}
    </template>
    <template v-else-if="step == 'running' && job.time.elapsed">
      {{ job.time.elapsed }} seconds elapsed
    </template>
    <template v-else-if="step == 'completing' && job.time.start && !job.time.end">
      <template v-if="job.time.limit.infinite">∞</template>
      <span v-else class="flex">
        <StopCircleIcon class="mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        {{
          // The value of job time limit is in minutes, it must be converted to seconds to
          // be added to job start.
          new Date((job.time.start + job.time.limit.number * 60) * 1000).toLocaleString()
        }}
      </span>
    </template>
    <template v-else-if="step == 'terminated' && job.time.end">
      {{ new Date(job.time.end * 1000).toLocaleString() }}
    </template>
  </span>
</template>
