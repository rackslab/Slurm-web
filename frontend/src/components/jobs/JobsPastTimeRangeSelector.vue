<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'

const { maxHours, defaultHours } = defineProps<{
  maxHours: number
  defaultHours: number
}>()

const emit = defineEmits<{
  select: [hours: number]
}>()

const runtimeStore = useRuntimeStore()

const pastHoursPresets = computed(() =>
  runtimeStore.jobs.pastHoursPresets(maxHours, defaultHours)
)

const selectedPastHours = computed(() => runtimeStore.jobs.pastHours)

function formatPastHoursLabel(hours: number): string {
  if (hours >= 168) return '7 d'
  if (hours >= 48) return '48 h'
  return `${hours} h`
}

function presetClass(hours: number): string {
  return selectedPastHours.value === hours
    ? 'bg-slurmweb dark:bg-slurmweb-verydark text-white'
    : 'bg-white text-gray-700 ring-1 ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600'
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="hours in pastHoursPresets"
      :key="hours"
      type="button"
      :class="[presetClass(hours), 'rounded-md px-3 py-1.5 text-sm font-medium']"
      @click="emit('select', hours)"
    >
      {{ formatPastHoursLabel(hours) }}
    </button>
  </div>
</template>
