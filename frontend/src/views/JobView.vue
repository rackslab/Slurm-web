<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import JobProgress from '@/components/job/JobProgress.vue'
import JobBackButton from '@/components/job/JobBackButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { HashtagIcon } from '@heroicons/vue/24/outline'
import JobFieldRaw from '@/components/job/JobFieldRaw.vue'
import JobFieldComment from '@/components/job/JobFieldComment.vue'
import JobFieldExitCode from '@/components/job/JobFieldExitCode.vue'
import JobResources from '@/components/job/JobResources.vue'
import JobRunSelector from '@/components/job/JobRunSelector.vue'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'
import { jobAllocatedGPU, jobRequestedGPU } from '@/composables/gateway/slurm/job'

const { cluster, id } = defineProps<{ cluster: string; id: number }>()

const route = useRoute()

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

const { data, unable, loaded, setCluster } = useClusterDataPoller<SlurmJobDetail>(
  cluster,
  'job',
  5000,
  id
)

/* All runs of the job (more than one when the job has been requeued), sorted by
 * submission time. The latest run is the last item. */
const runs = computed((): SlurmJobDetail[] => {
  if (!data.value) return []
  const { previous_runs, ...latest } = data.value
  return [...(previous_runs ?? []), latest]
})

/* Index of the run selected by user in runs array, null means the latest run. */
const selectedRun = ref<number | null>(null)

const selectedRunIndex = computed({
  get: (): number => {
    if (selectedRun.value === null || selectedRun.value >= runs.value.length) {
      return runs.value.length - 1
    }
    return selectedRun.value
  },
  set: (value: number) => {
    // Reset selection to null when the latest run is selected, so that the view
    // keeps following the latest run when the job is requeued again.
    selectedRun.value = value >= runs.value.length - 1 ? null : value
  }
})

const isPreviousRun = computed(() => selectedRunIndex.value < runs.value.length - 1)

/* Job run currently displayed */
const job = computed((): SlurmJobDetail | undefined => runs.value[selectedRunIndex.value])

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
    if (!job.value) return []
    return [
      {
        id: 'user',
        label: 'User',
        component: JobFieldRaw,
        props: {
          field: job.value.user,
          to: { name: 'user', params: { cluster, user: job.value.user } }
        }
      },
      { id: 'group', label: 'Group', component: JobFieldRaw, props: { field: job.value.group } },
      {
        id: 'account',
        label: 'Account',
        component: JobFieldRaw,
        props: {
          field: job.value.account,
          to: { name: 'account', params: { cluster, account: job.value.account } }
        }
      },
      {
        id: 'wckeys',
        label: 'Wckeys',
        component: JobFieldRaw,
        props: { field: job.value.wckey.wckey }
      },
      {
        id: 'priority',
        label: 'Priority',
        component: JobFieldRaw,
        props: { field: job.value.priority.number }
      },
      { id: 'name', label: 'Name', component: JobFieldRaw, props: { field: job.value.name } },
      {
        id: 'comments',
        label: 'Comments',
        component: JobFieldComment,
        props: { comment: job.value.comment }
      },
      {
        id: 'submit-line',
        label: 'Submit line',
        component: JobFieldRaw,
        props: { field: job.value.submit_line, monospace: true }
      },
      {
        id: 'script',
        label: 'Script',
        component: JobFieldRaw,
        props: { field: job.value.script }
      },
      {
        id: 'workdir',
        label: 'Working directory',
        component: JobFieldRaw,
        props: { field: job.value.working_directory, monospace: true }
      },
      {
        id: 'exit-code',
        label: 'Exit Code',
        component: JobFieldExitCode,
        props: { exit_code: job.value.exit_code }
      },
      { id: 'nodes', label: 'Nodes', component: JobFieldRaw, props: { field: job.value.nodes } },
      {
        id: 'partition',
        label: 'Partition',
        component: JobFieldRaw,
        props: { field: job.value.partition }
      },
      { id: 'qos', label: 'QOS', component: JobFieldRaw, props: { field: job.value.qos } },
      {
        id: 'tres-requested',
        label: 'Requested',
        component: JobResources,
        props: {
          tres: job.value.tres.requested,
          gpu: jobRequestedGPU(job.value)
        }
      },
      {
        id: 'tres-allocated',
        label: 'Allocated',
        component: JobResources,
        props: {
          tres: job.value.tres.allocated,
          gpu: { count: jobAllocatedGPU(job.value), reliable: true }
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

watch(
  () => cluster,
  (new_cluster) => {
    selectedRun.value = null
    setCluster(new_cluster)
  }
)

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
    <JobBackButton :cluster="cluster" />
    <ErrorAlert v-if="unable"
      >Unable to retrieve job {{ id }} from cluster
      <span class="font-medium">{{ cluster }}</span></ErrorAlert
    >
    <div v-else-if="!loaded" class="text-gray-400 sm:pl-6 lg:pl-8">
      <LoadingSpinner :size="5" />
      Loading job {{ id }}
    </div>
    <div v-else-if="job">
      <div class="flex justify-between">
        <div class="px-4 pb-8 sm:px-0">
          <h3 class="text-base leading-7 font-semibold text-gray-900 dark:text-gray-100">
            Job {{ id }}
          </h3>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-300">
            All job settings
            <span
              v-if="isPreviousRun"
              id="previous-run-notice"
              class="ml-2 rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
              >Showing previous run {{ selectedRunIndex + 1 }}, job has been requeued</span
            >
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <div>
            <JobStatusBadge :status="job.state.current" :large="true" />
            <span v-if="job.state.reason != 'None'">{{ job.state.reason }}</span>
          </div>
          <JobRunSelector v-if="runs.length > 1" v-model="selectedRunIndex" :runs="runs" />
        </div>
      </div>
      <div class="flex flex-wrap">
        <div class="w-full lg:w-1/3">
          <JobProgress :job="job" />
        </div>
        <div class="w-full lg:w-2/3">
          <div class="border-t border-gray-100 dark:border-gray-700">
            <dl class="divide-y divide-gray-100 dark:divide-gray-700">
              <div
                v-for="field in jobFieldsContent"
                :key="field.id"
                :id="`${field.id}`"
                :class="[
                  displayTags[field.id].highlight ? 'bg-slurmweb-light dark:bg-slurmweb-dark' : '',
                  'px-4 py-2 transition-colors duration-700 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0'
                ]"
              >
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
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
