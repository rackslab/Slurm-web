<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

const { runs } = defineProps<{ runs: SlurmJobDetail[] }>()

/* Index of the selected run in runs array, sorted by submission time. */
const selected = defineModel<number>({ required: true })

const submission = computed(() => {
  const run = runs[selected.value]
  if (!run) return ''
  return new Date(run.time.submission * 1000).toLocaleString()
})

function previous() {
  if (selected.value > 0) selected.value--
}

function next() {
  if (selected.value < runs.length - 1) selected.value++
}
</script>

<template>
  <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
    <button
      type="button"
      id="run-previous"
      class="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
      :disabled="selected <= 0"
      aria-label="Previous run"
      @click="previous"
    >
      <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
    </button>
    <span id="run-label" class="flex flex-col items-center leading-5">
      <span class="font-medium">Run {{ selected + 1 }} of {{ runs.length }}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">submitted {{ submission }}</span>
    </span>
    <button
      type="button"
      id="run-next"
      class="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
      :disabled="selected >= runs.length - 1"
      aria-label="Next run"
      @click="next"
    >
      <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</template>
