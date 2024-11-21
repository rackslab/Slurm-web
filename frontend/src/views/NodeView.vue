<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterIndividualNode, ClusterJob } from '@/composables/GatewayAPI'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
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

const node = useClusterDataPoller<ClusterIndividualNode>('node', 5000, props.nodeName)

/* Poll jobs on current nodes if user has permission on view-jobs action. */
let jobs: ClusterDataPoller<ClusterJob[]> | undefined
if (runtimeStore.hasPermission('view-jobs')) {
  jobs = useClusterDataPoller<ClusterJob[]>('jobs', 10000, props.nodeName)
}
</script>

<template>
  <ClusterMainLayout
    :cluster="cluster"
    :breadcrumb="[{ title: 'Resources', routeName: 'resources' }, { title: `Node ${nodeName}` }]"
  >
    <button
      @click="backToResources()"
      type="button"
      class="mb-16 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
    >
      <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
      Back to resources
    </button>
    <ErrorAlert v-if="node.unable.value"
      >Unable to retrieve node {{ nodeName }} from cluster
      <span class="font-medium">{{ props.cluster }}</span></ErrorAlert
    >
    <div v-else-if="!node.loaded" class="text-gray-400 sm:pl-6 lg:pl-8">
      <LoadingSpinner :size="5" />
      Loading node {{ nodeName }}
    </div>
    <div v-else-if="node.data.value">
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
              <div id="status" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Node status</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <NodeMainState :node="node.data.value" />
                  <span v-if="node.data.value.reason" class="pl-4 text-gray-500"
                    >reason: {{ node.data.value.reason }}</span
                  >
                </dd>
              </div>
              <div id="allocation" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Allocation status</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <NodeAllocationState :node="node.data.value" />
                  <ul class="list-disc pl-4 pt-4">
                    <li>
                      CPU: {{ node.data.value.alloc_cpus }} / {{ node.data.value.cpus }}
                      <span class="italic text-gray-400"
                        >({{ (node.data.value.alloc_cpus / node.data.value.cpus) * 100 }}%)</span
                      >
                    </li>
                    <li>
                      Memory: {{ node.data.value.alloc_memory }} / {{ node.data.value.real_memory }}
                      <span class="italic text-gray-400"
                        >({{
                          (node.data.value.alloc_memory / node.data.value.real_memory) * 100
                        }}%)</span
                      >
                    </li>
                  </ul>
                </dd>
              </div>
              <div v-if="jobs" id="jobs" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">
                  Current Jobs
                  <span
                    v-if="jobs.data.value"
                    class="ml-1 hidden rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-slurmweb md:inline-block"
                    >{{ jobs.data.value.length }}</span
                  >
                </dt>
                <dd class="text-sm leading-6 text-gray-700 sm:col-span-2">
                  <template v-if="jobs.data.value">
                    <ul v-if="jobs.data.value.length">
                      <li v-for="job in jobs.data.value" :key="job.job_id" class="inline">
                        <RouterLink
                          :to="{ name: 'job', params: { cluster: props.cluster, id: job.job_id } }"
                        >
                          <JobStatusBadge
                            :status="job.job_state"
                            :label="job.job_id.toString()"
                            class="mr-1"
                          />
                        </RouterLink>
                      </li>
                    </ul>
                    <span v-else class="text-gray-400">∅</span>
                  </template>
                </dd>
              </div>
              <div id="cpu" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">
                  CPU (socket x cores/socket)
                </dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ node.data.value.sockets }} x {{ node.data.value.cores }} =
                  {{ node.data.value.cpus }}
                </dd>
              </div>
              <div id="threads" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Threads/core</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ node.data.value.threads }}
                </dd>
              </div>
              <div id="arch" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Architecture</dt>
                <dd class="mt-1 font-mono text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ node.data.value.architecture }}
                </dd>
              </div>
              <div id="memory" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Memory</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ node.data.value.real_memory }}MB
                </dd>
              </div>
              <div id="partitions" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Partitions</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <span
                    v-for="partition in node.data.value.partitions"
                    :key="partition"
                    class="rounded bg-gray-500 px-2 py-1 font-medium text-white"
                    >{{ partition }}</span
                  >
                </dd>
              </div>
              <div id="kernel" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">OS Kernel</dt>
                <dd class="mt-1 font-mono text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ node.data.value.operating_system }}
                </dd>
              </div>
              <div id="reboot" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Reboot</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ new Date(node.data.value.boot_time * 10 ** 3).toLocaleString() }}
                </dd>
              </div>
              <div id="last" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Last busy</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ new Date(node.data.value.last_busy * 10 ** 3).toLocaleString() }}
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
