<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterNode } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'
import { isFiltersClusterNodeMainState } from '@/stores/runtime/resources'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const { cluster } = defineProps<{ cluster: string }>()

const runtimeStore = useRuntimeStore()
const router = useRouter()
const route = useRoute()
const { data, unable } = useClusterDataPoller<ClusterNode[]>(cluster, 'nodes', 10000)

const filteredNodes: Ref<ClusterNode[]> = computed(() => {
  if (!data.value) return []
  return [...data.value].filter((node) => runtimeStore.resources.matchesFilters(node))
})

function updateQueryParameters() {
  router.push({
    name: 'resources-diagram-nodes',
    params: { cluster },
    query: runtimeStore.resources.query() as LocationQueryRaw
  })
}

watch(
  () => runtimeStore.resources.filters.states,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => runtimeStore.resources.filters.partitions,
  () => {
    updateQueryParameters()
  }
)

onMounted(() => {
  if (['states', 'partitions'].some((parameter) => parameter in route.query)) {
    if (route.query.states) {
      runtimeStore.resources.filters.states = []
      ;(route.query.states as string).split(',').forEach((state: string) => {
        if (isFiltersClusterNodeMainState(state)) runtimeStore.resources.filters.states.push(state)
      })
    }
    if (route.query.partitions) {
      runtimeStore.resources.filters.partitions = (route.query.partitions as string).split(',')
    }
  } else {
    updateQueryParameters()
  }
})
</script>

<template>
  <div class="relative min-h-screen min-w-full bg-white dark:bg-gray-900">
    <div class="absolute top-0 right-0 z-50 pt-4 pr-4 sm:block">
      <button
        type="button"
        class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
        @click="router.push({ name: 'resources', params: { cluster } })"
      >
        <span class="sr-only">Close</span>
        <!-- X icon (inline to avoid headless UI dep) -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-6 w-6"
        >
          <path
            fill-rule="evenodd"
            d="M6.225 4.811a1 1 0 0 1 1.414 0L12 9.172l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 10.586l4.361 4.361a1 1 0 0 1-1.414 1.414L12 12l-4.361 4.361a1 1 0 1 1-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 0 1 0-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    <div class="relative mt-3 flex min-h-screen flex-col text-center sm:mt-0 sm:ml-4 sm:text-left">
      <h3 class="flex p-6 text-base leading-6 font-semibold text-gray-900 dark:text-gray-100">
        Cluster {{ cluster }}
      </h3>
      <ResourcesCanvas
        :cluster="cluster"
        :nodes="filteredNodes"
        :fullscreen="true"
        v-model="unable"
      />
    </div>

    <div class="px-6">
      <ErrorAlert v-if="unable" class="mt-4"
        >Unable to retrieve nodes from cluster
        <span class="font-medium">{{ cluster }}</span></ErrorAlert
      >
    </div>
  </div>
</template>
