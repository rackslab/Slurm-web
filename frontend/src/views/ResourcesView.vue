<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterNode } from '@/composables/GatewayAPI'
import ResourcesDiagram from '@/components/resources/ResourcesDiagram.vue'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import ResourcesFiltersPanel from '@/components/resources/ResourcesFiltersPanel.vue'
import ResourcesFiltersBar from '@/components/resources/ResourcesFiltersBar.vue'
import { foldNodeset, expandNodeset } from '@/composables/Nodeset'
import { ChevronRightIcon, MagnifyingGlassPlusIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const foldedNodesShow: Ref<Record<string, boolean>> = ref({})
const runtimeStore = useRuntimeStore()
const route = useRoute()
const router = useRouter()
const { data, unable, loaded } = useClusterDataPoller<ClusterNode[]>('nodes', 10000)

function arraysEqual<CType>(a: Array<CType>, b: Array<CType>): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
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
  const newFoldedNodesShow: Record<string, boolean> = {}

  function finishSet() {
    if (previousNode) {
      previousNode.name = foldNodeset(similarNodes)
      if (previousNode.name in foldedNodesShow.value) {
        newFoldedNodesShow[previousNode.name] = foldedNodesShow.value[previousNode.name]
      } else {
        newFoldedNodesShow[previousNode.name] = false
      }
    }
  }

  for (const currentNode of filteredNodes.value) {
    if (
      previousNode &&
      previousNode.sockets == currentNode.sockets &&
      previousNode.cores == currentNode.cores &&
      previousNode.real_memory == currentNode.real_memory &&
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
  // make new folded nodes show into effect
  foldedNodesShow.value = newFoldedNodesShow
  return result
})

function updateQueryParameters() {
  console.log('Updating query parameters')
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

onMounted(() => {
  if (['states', 'partitions'].some((parameter) => parameter in route.query)) {
    if (route.query.states) {
      /* Retrieve the states filters from query and update the store */
      runtimeStore.resources.filters.states = (route.query.states as string).split(',')
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
  <ClusterMainLayout :cluster="props.cluster" title="Resources">
    <div class="bg-white">
      <ResourcesFiltersPanel :cluster="props.cluster" :nbNodes="filteredNodes.length" />

      <div class="mx-auto flex items-center justify-between px-4 py-16 sm:px-6 lg:px-8">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Nodes</h1>
          <p class="mt-4 max-w-xl text-sm text-gray-700">State of nodes on cluster</p>
        </div>
        <div v-if="loaded" class="mt-4 text-right text-gray-600">
          <div class="text-5xl font-bold">{{ filteredNodes.length }}</div>
          <div class="text-sm font-light">node{{ filteredNodes.length > 1 ? 's' : '' }} found</div>
        </div>
        <div v-else class="flex animate-pulse space-x-4">
          <div class="h-14 w-14 rounded-2xl bg-slate-200"></div>
        </div>
      </div>

      <ResourcesDiagram :cluster="props.cluster" :nodes="filteredNodes" />
      <ResourcesFiltersBar :cluster="props.cluster" />

      <div v-if="unable">Unable to retrieve nodes information from cluster {{ props.cluster }}</div>
      <div v-else class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle">
            <table class="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    colspan="2"
                    class="w-12 py-3.5 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 lg:pl-8"
                  >
                    Nodename
                  </th>
                  <th
                    scope="col"
                    class="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    State
                  </th>
                  <th
                    scope="col"
                    class="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Allocation
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    CPU
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Memory
                  </th>

                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Partitions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <template v-for="node in foldedNodes" :key="node.name">
                  <tr class="bg-white">
                    <td class="w-4">
                      <button
                        v-if="node.number > 1"
                        class="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
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
                    <td class="whitespace-nowrap py-4 text-sm text-gray-900">
                      <RouterLink
                        v-if="node.number == 1"
                        class="inline-flex text-white hover:font-bold hover:text-gray-500"
                        :to="{
                          name: 'node',
                          params: { cluster: $props.cluster, nodeName: node.name }
                        }"
                      >
                        <span class="pr-4 font-mono text-black">{{ node.name }}</span>
                        <MagnifyingGlassPlusIcon class="h-4 w-4" />
                      </RouterLink>
                      <button
                        v-else
                        @click="foldedNodesShow[node.name] = !foldedNodesShow[node.name]"
                        class="hover:font-bold"
                      >
                        <span class="sr-only">Toggle folded nodes {{ node.name }}</span>
                        <span class="font-mono">{{ node.name }}</span>
                        <span class="px-1 font-normal italic text-gray-500"
                          >({{ node.number }})</span
                        >
                      </button>
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <NodeMainState :node="node" />
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <NodeAllocationState :node="node" />
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ node.sockets }} x {{ node.cores }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ node.real_memory }}MB
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span
                        v-for="partition in node.partitions"
                        class="rounded bg-gray-500 px-2 py-1 font-medium text-white"
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
                        <td colspan="7" class="z-0 bg-gray-300">
                          <ul
                            role="list"
                            class="lg:grid-cols-16 m-4 grid grid-cols-1 gap-5 sm:grid-cols-8 sm:gap-4"
                          >
                            <li
                              v-for="_node in expandNodeset(node.name)"
                              :key="_node"
                              class="col-span-1 flex rounded-md border-gray-200 bg-white text-left font-mono text-xs text-gray-500 shadow-sm transition-transform hover:scale-105"
                            >
                              <button
                                class="inline-flex w-full px-4 py-2 text-white hover:text-gray-500"
                                @click="
                                  router.push({
                                    name: 'node',
                                    params: { cluster: $props.cluster, nodeName: _node }
                                  })
                                "
                              >
                                <span class="visible mr-0 grow text-left text-gray-500">{{
                                  _node
                                }}</span>
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
