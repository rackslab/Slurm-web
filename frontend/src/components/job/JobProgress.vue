<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import JobProgressComment from '@/components/job/JobProgressComment.vue'
import { CheckIcon } from '@heroicons/vue/20/solid'

const { job } = defineProps<{ job: ClusterIndividualJob }>()

const current = computed((): [number, boolean] => {
  const now = new Date()
  if (job.time.end && new Date(job.time.end * 1000) < now) {
    return [5, false]
  }
  if (job.time.start) {
    if (new Date(job.time.start * 1000) < now) {
      return [2, true]
    } else {
      return [2, false]
    }
  }
  if (job.time.eligible && new Date(job.time.eligible * 1000) < now) {
    return [1, true]
  }
  if (job.time.submission && new Date(job.time.submission * 1000) < now) {
    return [0, true]
  }
  return [0, false]
})

function capitalize(step: string) {
  return step.charAt(0).toUpperCase() + step.slice(1)
}

const steps = ['submitted', 'eligible', 'scheduling', 'running', 'completing', 'terminated']
</script>

<template>
  <ol v-if="current" role="list" class="overflow-hidden">
    <li
      v-for="(step, stepIdx) in steps"
      :key="step"
      :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']"
      :id="'step-' + step"
    >
      <template v-if="current[0] >= stepIdx">
        <div
          v-if="stepIdx !== steps.length - 1"
          class="bg-slurmweb dark:bg-slurmweb-dark absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5"
          aria-hidden="true"
        />
        <div class="group relative flex items-start">
          <span class="flex h-9 items-center">
            <span
              class="bg-slurmweb dark:bg-slurmweb-dark relative z-10 flex h-8 w-8 items-center justify-center rounded-full"
            >
              <CheckIcon class="h-5 w-5 text-white" aria-hidden="true" />
            </span>
          </span>
          <span class="ml-4 flex min-w-0 flex-col">
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{
              capitalize(step)
            }}</span>
            <JobProgressComment :job="job" :step="step" />
          </span>
        </div>
      </template>
      <template v-else-if="current[0] + 1 == stepIdx && current[1]">
        <div
          v-if="stepIdx !== steps.length - 1"
          class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300 dark:bg-gray-700"
          aria-hidden="true"
        />
        <div class="group relative flex items-start" aria-current="step">
          <span class="flex h-9 items-center" aria-hidden="true">
            <span
              class="border-slurmweb dark:border-slurmweb-dark relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-900"
            >
              <span class="bg-slurmweb dark:bg-slurmweb-dark h-2.5 w-2.5 rounded-full" />
            </span>
          </span>
          <span class="ml-4 flex min-w-0 flex-col">
            <span class="text-slurmweb-dark dark:text-slurmweb text-sm font-medium">{{
              capitalize(step)
            }}</span>
            <JobProgressComment :job="job" :step="step" />
          </span>
        </div>
      </template>
      <template v-else>
        <div
          v-if="stepIdx !== steps.length - 1"
          class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300 dark:bg-gray-700"
          aria-hidden="true"
        />
        <div class="group relative flex items-start">
          <span class="flex h-9 items-center" aria-hidden="true">
            <span
              class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-transparent" />
            </span>
          </span>
          <span class="ml-4 flex min-w-0 flex-col">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-600">{{
              capitalize(step)
            }}</span>
            <JobProgressComment :job="job" :step="step" />
          </span>
        </div>
      </template>
    </li>
  </ol>
</template>
