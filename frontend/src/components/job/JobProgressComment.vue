<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import { StopCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  job: {
    type: Object as PropType<ClusterIndividualJob>,
    required: true
  },
  step: {
    type: String,
    required: true
  }
})
</script>

<template>
  <span class="text-sm text-gray-500">
    <template v-if="props.step == 'submitted'">
      {{ new Date(props.job.time.submission * 1000).toLocaleString() }}
    </template>
    <template v-else-if="props.step == 'eligible'">
      {{ new Date(props.job.time.eligible * 1000).toLocaleString() }}
    </template>
    <template v-else-if="props.step == 'scheduling' && props.job.time.start">
      {{ new Date(props.job.time.start * 1000).toLocaleString() }}
    </template>
    <template v-else-if="props.step == 'running' && props.job.time.elapsed">
      {{ props.job.time.elapsed }} seconds elapsed
    </template>
    <template v-else-if="props.step == 'completing' && props.job.time.start && !props.job.time.end">
      <template v-if="props.job.time.limit.infinite">∞</template>
      <span v-else class="flex">
        <StopCircleIcon class="mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        {{
          // The value of job time limit is in minutes, it must be converted to seconds to
          // be added to job start.
          new Date(
            (props.job.time.start + props.job.time.limit.number * 60) * 1000
          ).toLocaleString()
        }}
      </span>
    </template>
    <template v-else-if="props.step == 'terminated' && props.job.time.end">
      {{ new Date(props.job.time.end * 1000).toLocaleString() }}
    </template>
  </span>
</template>
