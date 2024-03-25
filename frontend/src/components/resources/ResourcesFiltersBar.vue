<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import type { ResourcesViewFilters, ResourcesViewSettings } from '@/stores/runtime'
import { FunnelIcon, BoltIcon, RectangleGroupIcon } from '@heroicons/vue/20/solid'
import { PlusSmallIcon } from '@heroicons/vue/24/outline'

const runtimeStore = useRuntimeStore()

const activeFiltersGroups: Array<{
  group: string
  list: keyof ResourcesViewFilters
  icon: FunctionalComponent
  removeCallback: (this: ResourcesViewSettings, filter: string) => void
  colors: { badge: string; button: string }
}> = [
  {
    group: 'state',
    list: 'states',
    icon: BoltIcon,
    removeCallback: runtimeStore.resources.removeStateFilter,
    colors: {
      badge: 'border-gray-200 bg-gray-600',
      button: 'text-gray-400 hover:bg-gray-700 hover:text-gray-500'
    }
  },
  {
    group: 'partition',
    list: 'partitions',
    icon: RectangleGroupIcon,
    removeCallback: runtimeStore.resources.removePartitionFilter,
    colors: {
      badge: 'border-gray-200 bg-amber-700',
      button: 'text-amber-800 hover:bg-amber-800 hover:text-amber-900'
    }
  }
]
</script>

<template>
  <section aria-labelledby="filter-heading" class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
    <h2 id="filter-heading" class="sr-only">Filters</h2>

    <div class="border-gray-200 bg-white pb-4">
      <div class="flex justify-end px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          class="inline-flex gap-x-1.5 rounded-md bg-slurmweb px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-darker focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb"
          @click="runtimeStore.resources.openFiltersPanel = true"
        >
          <PlusSmallIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Add filters
        </button>
      </div>
    </div>

    <!-- Active filters -->
    <div v-show="!runtimeStore.resources.emptyFilters()" class="bg-gray-100">
      <div class="mx-auto px-4 py-3 sm:flex sm:items-center sm:px-6 lg:px-8">
        <h3 class="text-sm font-medium text-gray-500">
          <FunnelIcon class="mr-1 h-4 w-4" />
          <span class="sr-only">Filters active</span>
        </h3>

        <div aria-hidden="true" class="hidden h-5 w-px bg-gray-300 sm:ml-4 sm:block" />

        <div class="mt-2 sm:ml-4 sm:mt-0">
          <div class="-m-1 flex flex-wrap items-center">
            <template
              v-for="activeFilterGroup in activeFiltersGroups"
              :key="activeFilterGroup.group"
            >
              <span
                v-for="activeFilter in runtimeStore.resources.filters[activeFilterGroup.list]"
                :key="activeFilter"
                :class="[
                  activeFilterGroup.colors.badge,
                  'm-1 inline-flex items-center rounded-full border py-1.5 pl-3 pr-2 text-sm font-medium text-white'
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
                  @click="
                    activeFilterGroup.removeCallback.call(runtimeStore.resources, activeFilter)
                  "
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
  </section>
</template>
