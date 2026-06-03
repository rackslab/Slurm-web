<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import type { JobsViewFilters } from '@/stores/runtime/jobs'
import {
  FunnelIcon,
  BoltIcon,
  RectangleGroupIcon,
  UserIcon,
  UsersIcon,
  SwatchIcon,
  TagIcon
} from '@heroicons/vue/20/solid'

const { past = false } = defineProps<{ past?: boolean }>()

const runtimeStore = useRuntimeStore()

const activeFiltersGroups: Array<{
  group: string
  icon: FunctionalComponent
  values: (filters: JobsViewFilters) => string[]
  removeCallback: (this: typeof runtimeStore.jobs, filter: string) => void
  colors: { badge: string; button: string }
}> = [
  {
    group: 'state',
    icon: BoltIcon,
    values: (filters) => (past ? filters.pastStates : filters.activeStates),
    removeCallback: past
      ? runtimeStore.jobs.removePastStateFilter
      : runtimeStore.jobs.removeActiveStateFilter,
    colors: {
      badge: 'border-gray-200 dark:border-gray-400 bg-gray-600 dark:bg-gray-500',
      button: 'text-gray-400 hover:bg-gray-700 hover:text-gray-500'
    }
  },
  {
    group: 'name',
    icon: TagIcon,
    values: (filters) => {
      const name = filters.name.trim()
      return name ? [name] : []
    },
    removeCallback: runtimeStore.jobs.clearNameFilter,
    colors: {
      badge: 'border-gray-200 dark:border-gray-400 bg-sky-600',
      button: 'text-sky-200 hover:bg-sky-700 hover:text-white'
    }
  },
  {
    group: 'user',
    icon: UserIcon,
    values: (filters) => filters.users,
    removeCallback: runtimeStore.jobs.removeUserFilter,
    colors: {
      badge: 'border-gray-200 dark:border-gray-400 bg-emerald-500',
      button: 'text-emerald-600 hover:bg-emerald-600 hover:text-emerald-700'
    }
  },
  {
    group: 'account',
    icon: UsersIcon,
    values: (filters) => filters.accounts,
    removeCallback: runtimeStore.jobs.removeAccountFilter,
    colors: {
      badge: 'border-gray-200 dark:border-gray-400 bg-yellow-500',
      button: 'text-yellow-600 hover:bg-yellow-600 hover:text-yellow-700'
    }
  },
  {
    group: 'qos',
    icon: SwatchIcon,
    values: (filters) => filters.qos,
    removeCallback: runtimeStore.jobs.removeQosFilter,
    colors: {
      badge: 'border-gray-200 dark:border-gray-400 bg-purple-500',
      button: 'text-purple-600 hover:bg-purple-600 hover:text-purple-700'
    }
  },
  {
    group: 'partition',
    icon: RectangleGroupIcon,
    values: (filters) => filters.partitions,
    removeCallback: runtimeStore.jobs.removePartitionFilter,
    colors: {
      badge: 'border-gray-200 dark:border-gray-400 bg-amber-700',
      button: 'text-amber-800 hover:bg-amber-800 hover:text-amber-900'
    }
  }
]
</script>

<template>
  <!-- Active filters -->
  <div v-show="!runtimeStore.jobs.emptyFilters(past)" class="bg-gray-100 dark:bg-gray-800">
    <div class="mx-auto px-4 py-3 sm:flex sm:items-center sm:px-6 lg:px-8">
      <h3 class="text-sm font-medium text-gray-500">
        <FunnelIcon class="mr-1 h-4 w-4" />
        <span class="sr-only">Filters active</span>
      </h3>

      <div aria-hidden="true" class="hidden h-5 w-px bg-gray-300 sm:ml-4 sm:block" />

      <div class="mt-2 sm:mt-0 sm:ml-4">
        <div class="-m-1 flex flex-wrap items-center">
          <template v-for="activeFilterGroup in activeFiltersGroups" :key="activeFilterGroup.group">
            <span
              v-for="activeFilter in activeFilterGroup.values(runtimeStore.jobs.filters)"
              :key="`${activeFilterGroup.group}-${activeFilter}`"
              :class="[
                activeFilterGroup.colors.badge,
                'm-1 inline-flex items-center rounded-full border py-1.5 pr-2 pl-3 text-xs font-medium text-white'
              ]"
            >
              <component :is="activeFilterGroup.icon" class="mr-1 h-4 w-4" />
              <span>{{ activeFilter }}</span>
              <button
                type="button"
                :class="[
                  activeFilterGroup.colors.button,
                  'ml-1 inline-flex h-4 w-4 shrink-0 rounded-full p-1'
                ]"
                @click="activeFilterGroup.removeCallback.call(runtimeStore.jobs, activeFilter)"
              >
                <span class="sr-only"
                  >Remove filter for {{ activeFilterGroup.group }}:{{ activeFilter }}</span
                >
                <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
