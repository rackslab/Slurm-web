<script setup lang="ts">
import { useRuntimeStore } from '@/stores/runtime'
import {
  FunnelIcon,
  BoltIcon,
  RectangleGroupIcon,
  UserIcon,
  UsersIcon,
  SwatchIcon
} from '@heroicons/vue/20/solid'

const runtimeStore = useRuntimeStore()
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
          <span
            v-for="activeStateFilter in runtimeStore.jobs.filters.states"
            :key="activeStateFilter"
            class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-gray-600 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
          >
            <BoltIcon class="mr-1 h-4 w-4" />
            <span>{{ activeStateFilter }}</span>
            <button
              type="button"
              class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-500"
              @click="runtimeStore.jobs.removeStateFilter(activeStateFilter)"
            >
              <span class="sr-only">Remove filter for state:{{ activeStateFilter }}</span>
              <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
          <span
            v-for="activeUserFilter in runtimeStore.jobs.filters.users"
            :key="activeUserFilter"
            class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-emerald-500 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
          >
            <UserIcon class="mr-1 h-4 w-4" />
            <span>{{ activeUserFilter }}</span>
            <button
              type="button"
              class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-emerald-600 hover:bg-emerald-600 hover:text-emerald-700"
              @click="runtimeStore.jobs.removeUserFilter(activeUserFilter)"
            >
              <span class="sr-only">Remove filter for user:{{ activeUserFilter }}</span>
              <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
          <span
            v-for="activeAccountFilter in runtimeStore.jobs.filters.accounts"
            :key="activeAccountFilter"
            class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-yellow-500 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
          >
            <UsersIcon class="mr-1 h-4 w-4" />
            <span>{{ activeAccountFilter }}</span>
            <button
              type="button"
              class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-yellow-600 hover:bg-yellow-600 hover:text-yellow-700"
              @click="runtimeStore.jobs.removeAccountFilter(activeAccountFilter)"
            >
              <span class="sr-only">Remove filter for account:{{ activeAccountFilter }}</span>
              <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
          <span
            v-for="activeQosFilter in runtimeStore.jobs.filters.qos"
            :key="activeQosFilter"
            class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-purple-500 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
          >
            <SwatchIcon class="mr-1 h-4 w-4" />
            <span>{{ activeQosFilter }}</span>
            <button
              type="button"
              class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-purple-600 hover:bg-purple-600 hover:text-purple-700"
              @click="runtimeStore.jobs.removeQosFilter(activeQosFilter)"
            >
              <span class="sr-only">Remove filter for qos:{{ activeQosFilter }}</span>
              <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
          <span
            v-for="activePartitionFilter in runtimeStore.jobs.filters.partitions"
            :key="activePartitionFilter"
            class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-amber-700 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
          >
            <RectangleGroupIcon class="mr-1 h-4 w-4" />
            <span>{{ activePartitionFilter }}</span>
            <button
              type="button"
              class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-amber-800 hover:bg-amber-800 hover:text-amber-900"
              @click="runtimeStore.jobs.removePartitionFilter(activePartitionFilter)"
            >
              <span class="sr-only">Remove filter for partition:{{ activePartitionFilter }}</span>
              <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
              </svg>
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
