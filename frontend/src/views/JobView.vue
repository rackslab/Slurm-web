<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { jobRequestedGPU, jobAllocatedGPU } from '@/composables/GatewayAPI'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import JobProgress from '@/components/job/JobProgress.vue'
import { useRuntimeStore } from '@/stores/runtime'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { HashtagIcon } from '@heroicons/vue/24/outline'
import JobFieldRaw from '@/components/job/JobFieldRaw.vue'
import JobFieldComment from '@/components/job/JobFieldComment.vue'
import JobFieldExitCode from '@/components/job/JobFieldExitCode.vue'
import JobResources from '@/components/job/JobResources.vue'

const { cluster, id } = defineProps<{ cluster: string; id: number }>()

const runtimeStore = useRuntimeStore()
const router = useRouter()
const route = useRoute()

function backToJobs() {
  router.push({
    name: 'jobs',
    params: { cluster: runtimeStore.currentCluster?.name },
    query: runtimeStore.jobs.query() as LocationQueryRaw
  })
}

const JobsFields = [
  'user',
  'group',
  'account',
  'wckeys',
  'priority',
  'name',
  'comments',
  'submit-line',
  'script',
  'workdir',
  'exit-code',
  'nodes',
  'partition',
  'qos',
  'tres-requested',
  'tres-allocated'
] as const
type JobField = (typeof JobsFields)[number]

function isValidJobField(key: string): key is JobField {
  return typeof key === 'string' && JobsFields.includes(key as JobField)
}

const { data, unable, loaded } = useClusterDataPoller<ClusterIndividualJob>('job', 5000, id)

const displayTags = ref<Record<JobField, { show: boolean; highlight: boolean }>>({
  user: { show: false, highlight: false },
  group: { show: false, highlight: false },
  account: { show: false, highlight: false },
  wckeys: { show: false, highlight: false },
  priority: { show: false, highlight: false },
  name: { show: false, highlight: false },
  comments: { show: false, highlight: false },
  'submit-line': { show: false, highlight: false },
  script: { show: false, highlight: false },
  workdir: { show: false, highlight: false },
  'exit-code': { show: false, highlight: false },
  nodes: { show: false, highlight: false },
  partition: { show: false, highlight: false },
  qos: { show: false, highlight: false },
  'tres-allocated': { show: false, highlight: false },
  'tres-requested': { show: false, highlight: false }
})

const jobFieldsContent = computed(
  (): { id: JobField; label: string; component: Component; props: object }[] => {
    if (!data.value) return []
    return [
      { id: 'user', label: 'User', component: JobFieldRaw, props: { field: data.value.user } },
      { id: 'group', label: 'Group', component: JobFieldRaw, props: { field: data.value.group } },
      {
        id: 'account',
        label: 'Account',
        component: JobFieldRaw,
        props: { field: data.value.association.account }
      },
      {
        id: 'wckeys',
        label: 'Wckeys',
        component: JobFieldRaw,
        props: { field: data.value.wckey.wckey }
      },
      {
        id: 'priority',
        label: 'Priority',
        component: JobFieldRaw,
        props: { field: data.value.priority.number }
      },
      { id: 'name', label: 'Name', component: JobFieldRaw, props: { field: data.value.name } },
      {
        id: 'comments',
        label: 'Comments',
        component: JobFieldComment,
        props: { comment: data.value.comment }
      },
      {
        id: 'submit-line',
        label: 'Submit line',
        component: JobFieldRaw,
        props: { field: data.value.submit_line, monospace: true }
      },
      {
        id: 'script',
        label: 'Script',
        component: JobFieldRaw,
        props: { field: data.value.script }
      },
      {
        id: 'workdir',
        label: 'Working directory',
        component: JobFieldRaw,
        props: { field: data.value.working_directory, monospace: true }
      },
      {
        id: 'exit-code',
        label: 'Exit Code',
        component: JobFieldExitCode,
        props: { exit_code: data.value.exit_code }
      },
      { id: 'nodes', label: 'Nodes', component: JobFieldRaw, props: { field: data.value.nodes } },
      {
        id: 'partition',
        label: 'Partition',
        component: JobFieldRaw,
        props: { field: data.value.partition }
      },
      { id: 'qos', label: 'QOS', component: JobFieldRaw, props: { field: data.value.qos } },
      {
        id: 'tres-requested',
        label: 'Requested',
        component: JobResources,
        props: { tres: data.value.tres.requested, gpu: jobRequestedGPU(data.value) }
      },
      {
        id: 'tres-allocated',
        label: 'Allocated',
        component: JobResources,
        props: {
          tres: data.value.tres.allocated,
          gpu: { count: jobAllocatedGPU(data.value), reliable: true }
        }
      }
    ]
  }
)

/* highlight this field for some time */
function highlightField(field: JobField) {
  displayTags.value[field].highlight = true
  setTimeout(() => {
    displayTags.value[field].highlight = false
  }, 2000)
}

onMounted(() => {
  /* If a job field is in route hash, highlight this field. */
  if (route.hash) {
    const field = route.hash.slice(1) // remove initial hash
    if (isValidJobField(field)) {
      highlightField(field)
    }
  }
})
</script>

<template>
  <ClusterMainLayout
    menu-entry="jobs"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Jobs', routeName: 'jobs' }, { title: `Job ${id}` }]"
  >
    <button
      @click="backToJobs()"
      type="button"
      class="bg-slurmweb hover:bg-slurmweb-dark focus-visible:outline-slurmweb-dark mt-8 mb-16 inline-flex items-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
      Back to jobs
    </button>

    <ErrorAlert v-if="unable"
      >Unable to retrieve job {{ id }} from cluster
      <span class="font-medium">{{ cluster }}</span></ErrorAlert
    >
    <div v-else-if="!loaded" class="text-gray-400 sm:pl-6 lg:pl-8">
      <LoadingSpinner :size="5" />
      Loading job {{ id }}
    </div>
    <div v-else-if="data">
      <div class="flex justify-between">
        <div class="px-4 pb-8 sm:px-0">
          <h3 class="text-base leading-7 font-semibold text-gray-900">Job {{ id }}</h3>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500">All job settings</p>
        </div>
        <div>
          <JobStatusBadge :status="data.state.current" :large="true" />
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
              <div
                v-for="field in jobFieldsContent"
                :key="field.id"
                :id="`${field.id}`"
                :class="[
                  displayTags[field.id].highlight ? 'bg-slurmweb-light' : '',
                  'px-4 py-2 transition-colors duration-700 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0'
                ]"
              >
                <dt class="text-sm leading-6 font-medium text-gray-900">
                  <a :href="`#${field.id}`">
                    <span
                      class="flex items-center"
                      @mouseover="displayTags[field.id].show = true"
                      @mouseleave="displayTags[field.id].show = false"
                    >
                      <HashtagIcon
                        v-show="displayTags[field.id].show"
                        class="mr-2 -ml-5 h-3 w-3 text-gray-500"
                        aria-hidden="true"
                      />
                      {{ field.label }}
                    </span>
                  </a>
                </dt>
                <component :is="field.component" v-bind="field.props" />
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
