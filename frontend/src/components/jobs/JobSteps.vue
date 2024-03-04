<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import { CheckIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  job: {
    type: Object as PropType<ClusterIndividualJob>,
    required: true
  }
})

const current = computed((): [number, boolean] => {
  const now = new Date()
  if (props.job.time.end && new Date(props.job.time.end * 1000) < now) {
    return [5, false]
  }
  if (props.job.time.start) {
    if (new Date(props.job.time.start * 1000) < now) {
      return [2, true]
    } else {
      return [2, false]
    }
  }
  if (props.job.time.eligible && new Date(props.job.time.eligible * 1000) < now) {
    return [1, true]
  }
  if (props.job.time.submission && new Date(props.job.time.submission * 1000) < now) {
    return [0, true]
  }
  return [0, false]
})

function stepComment(step: string) {
  if (step === 'Submitted') {
    return new Date(props.job.time.submission * 1000).toLocaleString()
  }
  if (step === 'Eligible') {
    return new Date(props.job.time.eligible * 1000).toLocaleString()
  }
  if (step === 'Scheduling') {
    if (props.job.time.start) {
      return new Date(props.job.time.start * 1000).toLocaleString()
    }
  }
  if (step === 'Running') {
    if (props.job.time.elapsed) {
      return `${props.job.time.elapsed} seconds elapsed`
    }
  }
  if (step === 'Completing') {
    return ''
  }
  if (step === 'Terminated') {
    if (props.job.time.end) {
      return new Date(props.job.time.end * 1000).toLocaleString()
    }
  }
  return ''
}

const steps = ['Submitted', 'Eligible', 'Scheduling', 'Running', 'Completing', 'Terminated']
</script>

<template>
  <ol v-if="current" role="list" class="overflow-hidden">
    <li
      v-for="(step, stepIdx) in steps"
      :key="step"
      :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']"
    >
      <template v-if="current[0] >= stepIdx">
        <div
          v-if="stepIdx !== steps.length - 1"
          class="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-slurmweb"
          aria-hidden="true"
        />
        <div class="group relative flex items-start">
          <span class="flex h-9 items-center">
            <span
              class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slurmweb"
            >
              <CheckIcon class="h-5 w-5 text-white" aria-hidden="true" />
            </span>
          </span>
          <span class="ml-4 flex min-w-0 flex-col">
            <span class="text-sm font-medium">{{ step }}</span>
            <span class="text-sm text-gray-500">{{ stepComment(step) }}</span>
          </span>
        </div>
      </template>
      <template v-else-if="current[0] + 1 == stepIdx && current[1]">
        <div
          v-if="stepIdx !== steps.length - 1"
          class="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
          aria-hidden="true"
        />
        <div class="group relative flex items-start" aria-current="step">
          <span class="flex h-9 items-center" aria-hidden="true">
            <span
              class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slurmweb bg-white"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-slurmweb" />
            </span>
          </span>
          <span class="ml-4 flex min-w-0 flex-col">
            <span class="text-sm font-medium text-slurmweb-dark">{{ step }}</span>
            <span class="text-sm text-gray-500">{{ stepComment(step) }}</span>
          </span>
        </div>
      </template>
      <template v-else>
        <div
          v-if="stepIdx !== steps.length - 1"
          class="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
          aria-hidden="true"
        />
        <div class="group relative flex items-start">
          <span class="flex h-9 items-center" aria-hidden="true">
            <span
              class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-transparent" />
            </span>
          </span>
          <span class="ml-4 flex min-w-0 flex-col">
            <span class="text-sm font-medium text-gray-500">{{ step }}</span>
            <span class="text-sm text-gray-500">{{ stepComment(step) }}</span>
          </span>
        </div>
      </template>
    </li>
  </ol>
</template>
