<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { isFiltersClusterNodeMainState } from '@/stores/runtime/resources'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { getMBHumanUnit, getNodeGPU } from '@/composables/GatewayAPI'
import type { ClusterNode } from '@/composables/GatewayAPI'
import ResourcesDiagram from '@/components/resources/ResourcesDiagram.vue'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import NodeGPU from '@/components/resources/NodeGPU.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import ResourcesFiltersPanel from '@/components/resources/ResourcesFiltersPanel.vue'
import ResourcesFiltersBar from '@/components/resources/ResourcesFiltersBar.vue'
import { foldNodeset, expandNodeset } from '@/composables/Nodeset'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { ChevronRightIcon, MagnifyingGlassPlusIcon } from '@heroicons/vue/20/solid'

const { cluster } = defineProps<{ cluster: string }>()

const foldedNodesShow: Ref<Record<string, boolean>> = ref({})
const runtimeStore = useRuntimeStore()
const route = useRoute()
const router = useRouter()
const { data, unable, loaded, setCluster } = useClusterDataPoller<ClusterNode[]>(
  cluster,
  'nodes',
  10000
)

function arraysEqual<CType>(a: Array<CType>, b: Array<CType>): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}

interface FoldedClusterNode extends ClusterNode {
  number: number
}

const filteredNodes: Ref<ClusterNode[]> = computed(() => {
  if (!data.value) {
    return []
  }
  return [...data.value].filter((node) => runtimeStore.resources.matchesFilters(node))
})

const foldedNodes: Ref<FoldedClusterNode[]> = computed(() => {
  let previousNode: FoldedClusterNode | undefined = undefined
  let similarNodes: string[] = []
  const result: FoldedClusterNode[] = []

  function finishSet() {
    if (previousNode) {
      previousNode.name = foldNodeset(similarNodes)
    }
  }

  for (const currentNode of filteredNodes.value) {
    if (
      previousNode &&
      previousNode.sockets == currentNode.sockets &&
      previousNode.cores == currentNode.cores &&
      previousNode.real_memory == currentNode.real_memory &&
      getNodeGPU(previousNode.gres).join(',') == getNodeGPU(currentNode.gres).join(',') &&
      arraysEqual<string>(previousNode.state, currentNode.state) &&
      arraysEqual<string>(previousNode.partitions, currentNode.partitions)
    ) {
      previousNode.number += 1
      similarNodes.push(currentNode.name)
    } else {
      finishSet()
      // Prepare next iteration
      previousNode = { ...currentNode, number: 1 }
      similarNodes = [currentNode.name]
      // Push next folded node in result
      result.push(previousNode)
    }
  }
  // handle last node
  finishSet()
  return result
})

function updateQueryParameters() {
  router.push({ name: 'resources', query: runtimeStore.resources.query() as LocationQueryRaw })
}

/*
 * Watch states and users filters in Pinia store to update route query
 * accordingly.
 *
 * This is not explained in Pinia documentation but to watch Pinia store nested
 * attribute, the solution is to used watch getter. This solution has been found
 * here: https://stackoverflow.com/a/71937507
 */
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
/*
 * Update foldedNodesShow record when foldedNodes.value is updated. This is not
 * a computed ref because computed refs are read-only and we need to modify
 * foldedNodesShow values in template.
 */
watch(
  () => foldedNodes.value,
  () => {
    const newFoldedNodesShow: Record<string, boolean> = {}

    for (const foldedNodeset of foldedNodes.value) {
      if (foldedNodesShow.value && foldedNodeset.name in foldedNodesShow.value) {
        newFoldedNodesShow[foldedNodeset.name] = foldedNodesShow.value[foldedNodeset.name]
      } else {
        newFoldedNodesShow[foldedNodeset.name] = false
      }
    }
    foldedNodesShow.value = newFoldedNodesShow
  }
)

watch(
  () => cluster,
  (new_cluster) => {
    setCluster(new_cluster)
  }
)

onMounted(() => {
  if (['states', 'partitions'].some((parameter) => parameter in route.query)) {
    if (route.query.states) {
      /* Retrieve the states filters from query and update the store */
      runtimeStore.resources.filters.states = []
      ;(route.query.states as string).split(',').forEach((state: string) => {
        if (isFiltersClusterNodeMainState(state)) runtimeStore.resources.filters.states.push(state)
      })
    }
    if (route.query.partitions) {
      /* Retrieve the partitions filters from query and update the store */
      runtimeStore.resources.filters.partitions = (route.query.partitions as string).split(',')
    }
  } else {
    /* Route has no query parameter. Update query parameters to match those that
     * can be defined in runtime store. This typically happens when user define
     * filters, leave jobs route (eg. in left menu) and comes back. */
    updateQueryParameters()
  }
})
</script>

<template>
  <ClusterMainLayout
    menu-entry="resources"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Resources' }]"
  >
    <div>
      <ResourcesFiltersPanel :cluster="cluster" :nbNodes="filteredNodes.length" />

      <div class="mx-auto flex items-center justify-between px-4 py-16 sm:px-6 lg:px-8">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Nodes</h1>
          <p class="mt-4 max-w-xl text-sm text-gray-700 dark:text-gray-300">
            State of nodes on cluster
          </p>
        </div>
        <div v-if="loaded" class="mt-4 text-right text-gray-600 dark:text-gray-300">
          <div class="text-5xl font-bold">{{ filteredNodes.length }}</div>
          <div class="text-sm font-light">node{{ filteredNodes.length > 1 ? 's' : '' }} found</div>
        </div>
        <div v-else class="flex animate-pulse space-x-4">
          <div class="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
      </div>

      <ResourcesDiagram
        v-if="runtimeStore.getCluster(cluster).racksdb"
        :cluster="cluster"
        :nodes="filteredNodes"
      />
      <ResourcesFiltersBar />

      <ErrorAlert v-if="unable"
        >Unable to retrieve nodes from cluster
        <span class="font-medium">{{ cluster }}</span></ErrorAlert
      >
      <div v-else class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle">
            <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-500">
              <thead>
                <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                  <th scope="col" colspan="2" class="w-12 py-3.5 pr-3 text-left sm:pl-6 lg:pl-8">
                    Nodename
                  </th>
                  <th scope="col" class="w-12 px-3 py-3.5 text-left">State</th>
                  <th scope="col" class="w-12 px-3 py-3.5 text-left">Allocation</th>
                  <th scope="col" class="px-3 py-3.5 text-left">CPU</th>
                  <th scope="col" class="px-3 py-3.5 text-left">Memory</th>
                  <th scope="col" class="px-3 py-3.5 text-left">GPU</th>
                  <th scope="col" class="px-3 py-3.5 text-left">Partitions</th>
                </tr>
              </thead>
              <tbody
                class="divide-y divide-gray-200 text-sm text-gray-500 dark:divide-gray-700 dark:text-gray-300"
              >
                <template v-for="node in foldedNodes" :key="node.name">
                  <tr>
                    <td class="w-4">
                      <button
                        v-if="node.number > 1"
                        class="-mr-2 flex h-10 w-10 items-center justify-center rounded-md p-2 text-gray-400"
                        @click="foldedNodesShow[node.name] = !foldedNodesShow[node.name]"
                      >
                        <span class="sr-only">Toggle folded nodes {{ node.name }}</span>
                        <ChevronRightIcon
                          class="h-6 w-6"
                          aria-hidden="true"
                          :class="[foldedNodesShow[node.name] ? 'rotate-90' : '', 'transition']"
                        />
                      </button>
                    </td>
                    <td class="py-4 text-sm whitespace-nowrap">
                      <RouterLink
                        v-if="node.number == 1"
                        class="inline-flex text-white hover:font-bold hover:text-gray-500 dark:text-gray-900 hover:dark:text-gray-300"
                        :to="{
                          name: 'node',
                          params: { cluster: cluster, nodeName: node.name }
                        }"
                      >
                        <span class="pr-4 font-mono text-black dark:text-gray-100">{{
                          node.name
                        }}</span>
                        <MagnifyingGlassPlusIcon class="h-4 w-4" />
                      </RouterLink>
                      <button
                        v-else
                        @click="foldedNodesShow[node.name] = !foldedNodesShow[node.name]"
                        class="hover:font-bold"
                      >
                        <span class="sr-only">Toggle folded nodes {{ node.name }}</span>
                        <span class="font-mono text-gray-900 dark:text-gray-100">{{
                          node.name
                        }}</span>
                        <span class="px-1 font-normal text-gray-500 italic"
                          >({{ node.number }})</span
                        >
                      </button>
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                      <NodeMainState :status="node.state" />
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                      <NodeAllocationState :status="node.state" />
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                      {{ node.sockets }} x {{ node.cores }}
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                      {{ getMBHumanUnit(node.real_memory) }}
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                      <NodeGPU :node="node" />
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap">
                      <span
                        v-for="partition in node.partitions"
                        :key="partition"
                        class="rounded-sm bg-gray-500 px-2 py-1 font-medium text-white"
                        >{{ partition }}</span
                      >
                    </td>
                  </tr>
                  <template v-if="node.number > 1">
                    <Transition
                      enter-active-class="duration-100 ease-out"
                      enter-from-class="-translate-y-6 opacity-0"
                      enter-to-class="opacity-100"
                      leave-active-class="duration-100 ease-out"
                      leave-from-class="opacity-100"
                      leave-to-class="-translate-y-6 opacity-0"
                    >
                      <tr v-show="foldedNodesShow[node.name]">
                        <td colspan="8" class="z-0 bg-gray-300 dark:bg-gray-800">
                          <ul
                            role="list"
                            class="m-4 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4 md:grid-cols-4 xl:grid-cols-8 2xl:grid-cols-16"
                          >
                            <li
                              v-for="_node in expandNodeset(node.name)"
                              :key="_node"
                              class="col-span-1 divide-y divide-gray-200 rounded-md bg-white text-left font-mono text-xs shadow-xs transition-transform hover:scale-105 dark:bg-gray-700"
                            >
                              <button
                                class="flex w-full items-center justify-between space-x-6 px-4 py-2 text-white hover:text-gray-500 dark:text-gray-700"
                                @click="
                                  router.push({
                                    name: 'node',
                                    params: { cluster: $props.cluster, nodeName: _node }
                                  })
                                "
                              >
                                <span
                                  class="visible mr-0 grow text-left text-gray-500 dark:text-gray-100"
                                  >{{ _node }}</span
                                >
                                <MagnifyingGlassPlusIcon class="h-4 w-4" />
                              </button>
                            </li>
                          </ul>
                        </td>
                      </tr>
                    </Transition>
                  </template>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
