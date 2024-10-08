<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import JobStatusLabel from '@/components/jobs/JobStatusLabel.vue'
import JobProgress from '@/components/jobs/JobProgress.vue'
import { useRuntimeStore } from '@/stores/runtime'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  },
  id: {
    type: Number,
    required: true
  }
})

const runtimeStore = useRuntimeStore()
const router = useRouter()

function backToJobs() {
  router.push({
    name: 'jobs',
    params: { cluster: runtimeStore.currentCluster?.name },
    query: runtimeStore.jobs.query() as LocationQueryRaw
  })
}

const { data, unable, loaded } = useClusterDataPoller<ClusterIndividualJob>('job', 5000, props.id)
</script>

<template>
  <ClusterMainLayout
    :cluster="cluster"
    :breadcrumb="[{ title: 'Jobs', routeName: 'jobs' }, { title: `Job ${id}` }]"
  >
    <button
      @click="backToJobs()"
      type="button"
      class="mb-16 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
    >
      <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
      Back to jobs
    </button>

    <ErrorAlert v-if="unable"
      >Unable to retrieve job {{ id }} from cluster
      <span class="font-medium">{{ props.cluster }}</span></ErrorAlert
    >
    <div v-else-if="!loaded" class="text-gray-400 sm:pl-6 lg:pl-8">
      <LoadingSpinner :size="5" />
      Loading job {{ id }}
    </div>
    <div v-else-if="data">
      <div class="flex justify-between">
        <div class="px-4 pb-8 sm:px-0">
          <h3 class="text-base font-semibold leading-7 text-gray-900">Job {{ id }}</h3>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500">All job settings</p>
        </div>
        <div>
          <JobStatusLabel :status="data.state.current" :large="true" />
          <span v-if="data.state.reason != 'None'">{{ data.state.reason }}</span>
        </div>
      </div>
      <div class="flex flex-wrap">
        <div class="w-full lg:w-1/3">
          <JobProgress v-if="data" :job="data" />
        </div>
        <div class="w-full lg:w-2/3">
          <div class="border-t border-gray-100">
            <dl class="divide-y divide-gray-100">
              <!-- Association -->
              <div id="job-user" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">User</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.user }}
                </dd>
              </div>
              <div id="job-group" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Group</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.group }}
                </dd>
              </div>
              <div id="job-account" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Account</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.association.account }}
                </dd>
              </div>
              <div id="job-wckey" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Wckeys</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.wckey.wckey }}
                </dd>
              </div>
              <!-- General information -->
              <div id="job-priority" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Priority</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.priority.number }}
                </dd>
              </div>
              <div id="job-name" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Name</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.name }}
                </dd>
              </div>
              <div id="job-comments" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Comments</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <p v-if="data.comment.administrator">
                    <span class="italic">(administrator)</span> {{ data.comment.administrator }}
                  </p>
                  <p v-if="data.comment.system">
                    <span class="italic">(system)</span> {{ data.comment.system }}
                  </p>
                  <p v-if="data.comment.job">
                    <span class="italic">(job)</span> {{ data.comment.job }}
                  </p>
                </dd>
              </div>
              <div id="job-submit-line" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Submit line</dt>
                <dd class="mt-1 font-mono text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.submit_line }}
                </dd>
              </div>
              <div id="job-script" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Script</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.script }}
                </dd>
              </div>
              <div id="job-workdir" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Working directory</dt>
                <dd class="mt-1 font-mono text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.working_directory }}
                </dd>
              </div>
              <div id="job-exit-code" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Exit Code</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.exit_code.status }} ({{ data.exit_code.return_code }})
                </dd>
              </div>
              <!-- Resources -->
              <div id="job-nodes" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Nodes</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.nodes }}
                </dd>
              </div>
              <div id="job-partition" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">Partition</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.partition }}
                </dd>
              </div>
              <div id="job-qos" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm font-medium leading-6 text-gray-900">QOS</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {{ data.qos }}
                </dd>
              </div>
              <div
                id="job-tres-requested"
                class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
              >
                <dt class="text-sm font-medium leading-6 text-gray-900">Requested</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <ul>
                    <li v-for="tres in data.tres.requested" :key="tres.id">
                      {{ tres.type }}: {{ tres.count }}
                    </li>
                  </ul>
                </dd>
              </div>
              <div
                id="job-tres-allocated"
                class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
              >
                <dt class="text-sm font-medium leading-6 text-gray-900">Allocated</dt>
                <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  <ul>
                    <li v-for="tres in data.tres.allocated" :key="tres.id">
                      {{ tres.type }}: {{ tres.count }}
                    </li>
                  </ul>
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
