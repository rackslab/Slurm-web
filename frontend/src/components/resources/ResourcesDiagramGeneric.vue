<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
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
import ResourcesDiagramNavigation from '@/components/resources/ResourcesDiagramNavigation.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const { cluster, mode } = defineProps<{
  cluster: string
  mode: 'nodes' | 'cores'
}>()

const runtimeStore = useRuntimeStore()
const router = useRouter()
const route = useRoute()
const { data, unable, loaded } = useClusterDataPoller<ClusterNode[]>(cluster, 'nodes', 10000)

const filteredNodes: Ref<ClusterNode[]> = computed(() => {
  if (!data.value) return []
  return [...data.value].filter((node) => runtimeStore.resources.matchesFilters(node))
})

function updateQueryParameters() {
  router.push({
    name: `resources-diagram-${mode}`,
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
  <div class="relative flex min-h-screen min-w-full flex-col bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between p-6">
      <h3 class="text-base leading-6 font-semibold text-gray-900 dark:text-gray-100">
        Cluster {{ cluster }}
      </h3>
      <ResourcesDiagramNavigation :cluster="cluster" :current-view="mode" />
      <button
        type="button"
        class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 hover:dark:bg-gray-700 hover:dark:text-gray-100"
        @click="router.push({ name: 'resources', params: { cluster } })"
        title="Close"
      >
        <span class="sr-only">Close</span>
        <XMarkIcon class="h-6 w-6" />
      </button>
    </div>

    <div v-if="unable" class="px-6">
      <ErrorAlert class="mt-4"
        >Unable to retrieve nodes from cluster
        <span class="font-medium">{{ cluster }}</span></ErrorAlert
      >
    </div>

    <ResourcesCanvas
      :cluster="cluster"
      :nodes="filteredNodes"
      :fullscreen="true"
      :mode="mode"
      :loading="!loaded"
      v-model="unable"
    />
  </div>
</template>
