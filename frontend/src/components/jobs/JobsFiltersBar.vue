<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import type { JobsViewFilters, JobsViewSettings } from '@/stores/runtime'
import {
  FunnelIcon,
  BoltIcon,
  RectangleGroupIcon,
  UserIcon,
  UsersIcon,
  SwatchIcon
} from '@heroicons/vue/20/solid'

const runtimeStore = useRuntimeStore()

const activeFiltersGroups: Array<{
  group: string
  list: keyof JobsViewFilters
  icon: FunctionalComponent
  removeCallback: (this: JobsViewSettings, filter: string) => void
  colors: { badge: string; button: string }
}> = [
  {
    group: 'state',
    list: 'states',
    icon: BoltIcon,
    removeCallback: runtimeStore.jobs.removeStateFilter,
    colors: {
      badge: 'border-gray-200 bg-gray-600',
      button: 'text-gray-400 hover:bg-gray-700 hover:text-gray-500'
    }
  },
  {
    group: 'user',
    list: 'users',
    icon: UserIcon,
    removeCallback: runtimeStore.jobs.removeUserFilter,
    colors: {
      badge: 'border-gray-200 bg-emerald-500',
      button: 'text-emerald-600 hover:bg-emerald-600 hover:text-emerald-700'
    }
  },
  {
    group: 'account',
    list: 'accounts',
    icon: UsersIcon,
    removeCallback: runtimeStore.jobs.removeAccountFilter,
    colors: {
      badge: 'border-gray-200 bg-yellow-500',
      button: 'text-yellow-600 hover:bg-yellow-600 hover:text-yellow-700'
    }
  },
  {
    group: 'qos',
    list: 'qos',
    icon: SwatchIcon,
    removeCallback: runtimeStore.jobs.removeQosFilter,
    colors: {
      badge: 'border-gray-200 bg-purple-500',
      button: 'text-purple-600 hover:bg-purple-600 hover:text-purple-700'
    }
  },
  {
    group: 'partition',
    list: 'partitions',
    icon: RectangleGroupIcon,
    removeCallback: runtimeStore.jobs.removePartitionFilter,
    colors: {
      badge: 'border-gray-200 bg-amber-700',
      button: 'text-amber-800 hover:bg-amber-800 hover:text-amber-900'
    }
  }
]
</script>

<template>
  <!-- Active filters -->
  <div v-show="!runtimeStore.jobs.emptyFilters()" class="bg-gray-100">
    <div class="mx-auto px-4 py-3 sm:flex sm:items-center sm:px-6 lg:px-8">
      <h3 class="text-sm font-medium text-gray-500">
        <FunnelIcon class="mr-1 h-4 w-4" />
        <span class="sr-only">Filters active</span>
      </h3>

      <div aria-hidden="true" class="hidden h-5 w-px bg-gray-300 sm:ml-4 sm:block" />

      <div class="mt-2 sm:ml-4 sm:mt-0">
        <div class="-m-1 flex flex-wrap items-center">
          <template v-for="activeFilterGroup in activeFiltersGroups" :key="activeFilterGroup.group">
            <span
              v-for="activeFilter in runtimeStore.jobs.filters[activeFilterGroup.list]"
              :key="activeFilter"
              :class="[
                activeFilterGroup.colors.badge,
                'm-1 inline-flex items-center rounded-full border py-1.5 pl-3 pr-2 text-xs font-medium text-white'
              ]"
            >
              <component :is="activeFilterGroup.icon" class="mr-1 h-4 w-4"></component>
              <span>{{ activeFilter }}</span>
              <button
                type="button"
                :class="[
                  activeFilterGroup.colors.button,
                  'ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1'
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
