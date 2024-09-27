<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'

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
    <template v-else-if="props.step == 'terminated' && props.job.time.end">
      {{ new Date(props.job.time.end * 1000).toLocaleString() }}
    </template>
  </span>
</template>
