<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterIndividualNode } from '@/composables/GatewayAPI'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  },
  nodeName: {
    type: String,
    required: true
  }
})

const runtimeStore = useRuntimeStore()
const router = useRouter()

function backToResources() {
  router.push({
    name: 'resources',
    params: { cluster: runtimeStore.currentCluster?.name },
    query: runtimeStore.resources.query() as LocationQueryRaw
  })
}

const { data, unable, loaded } = useClusterDataPoller<ClusterIndividualNode>(
  'node',
  5000,
  props.nodeName
)
</script>

<template>
  <ClusterMainLayout :cluster="cluster" :title="`Node ${nodeName}`">
    <button
      @click="backToResources()"
      type="button"
      class="mb-16 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
    >
      <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
      Back to resources
    </button>
    <ErrorAlert v-if="unable"
      >Unable to retrieve node {{ nodeName }} from cluster
      <span class="font-medium">{{ props.cluster }}</span></ErrorAlert
    >
    <div v-else-if="!loaded" class="text-gray-400 sm:pl-6 lg:pl-8">
      <LoadingSpinner :size="5" />
      Loading node {{ nodeName }}
    </div>
    <div v-else-if="data">
      <div class="flex justify-between">
        <div class="px-4 pb-8 sm:px-0">
          <h3 class="text-base font-semibold leading-7 text-gray-900">Node {{ nodeName }}</h3>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500">All node statuses</p>
        </div>
      </div>
      <div class="flex flex-wrap">
        <div class="w-full">
          <div class="border-t border-gray-100">
            <dl class="divide-y divide-gray-100">
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Node status</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <NodeMainState :node="data" />
                  <span v-if="data.reason" class="pl-4 text-gray-500"
                    >reason: {{ data.reason }}</span
                  >
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Allocation status</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <NodeAllocationState :node="data" />
                  <ul class="list-disc pl-4 pt-4">
                    <li>
                      CPU: {{ data.alloc_cpus }} / {{ data.cpus }}
                      <span class="italic text-gray-400"
                        >({{ (data.alloc_cpus / data.cpus) * 100 }}%)</span
                      >
                    </li>
                    <li>
                      Memory: {{ data.alloc_memory }} / {{ data.real_memory }}
                      <span class="italic text-gray-400"
                        >({{ (data.alloc_memory / data.real_memory) * 100 }}%)</span
                      >
                    </li>
                  </ul>
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">
                  CPU (socket x cores/socket)
                </dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.sockets }} x {{ data.cores }} = {{ data.cpus }}
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Threads/core</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.threads }}
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Architecture</dt>
                <dd class="mt-1 font-mono text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.architecture }}
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Memory</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.real_memory }}MB
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Partitions</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <span
                    v-for="partition in data.partitions"
                    :key="partition"
                    class="rounded bg-gray-500 px-2 py-1 font-medium text-white"
                    >{{ partition }}</span
                  >
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">OS Kernel</dt>
                <dd class="mt-1 font-mono text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.operating_system }}
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Reboot</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ new Date(data.boot_time * 10 ** 3).toLocaleString() }}
                </dd>
              </div>
              <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Last busy</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ new Date(data.last_busy * 10 ** 3).toLocaleString() }}
                </dd>
              </div>
              <!--
                <div v-for="(value, property) in data" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-gray-900">{{  property }}</dt>
                  <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0"> {{ value }}</dd>
                </div>
              -->
            </dl>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
