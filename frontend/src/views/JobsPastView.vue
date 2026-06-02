<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { useJobsPageQuery } from '@/composables/jobs/JobsPageQuery'
import { useJobsListPaging } from '@/composables/jobs/JobsListPaging'
import {
  acctJobStates,
  compareClusterAcctJobSortOrder,
  formatAcctJobEndTime,
  type ClusterAcctJob
} from '@/composables/GatewayAPI'
import { PAST_JOBS_DEFAULT_HOURS } from '@/stores/runtime/jobs'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import JobsSorter from '@/components/jobs/JobsSorter.vue'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import JobsFiltersPanel from '@/components/jobs/JobsFiltersPanel.vue'
import JobsFiltersBar from '@/components/jobs/JobsFiltersBar.vue'
import AcctJobResources from '@/components/jobs/AcctJobResources.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import { PlayIcon, PlusSmallIcon, WindowIcon } from '@heroicons/vue/24/outline'

const { cluster } = defineProps<{ cluster: string }>()

const route = useRoute()
const runtimeStore = useRuntimeStore()

const poller = useClusterDataPoller<ClusterAcctJob[]>(
  cluster,
  'jobsPast',
  60000,
  PAST_JOBS_DEFAULT_HOURS
)

const { updateQueryParameters, setupFilterQuerySync } = useJobsPageQuery('jobs-past')

const maxPastHours = computed(
  () => runtimeStore.currentCluster?.slurmdbd.jobs_max_hours ?? 168
)

const jobsList = computed((): ClusterAcctJob[] => poller.data.value ?? [])

const { sortedJobs, lastpage, firstjob, lastjob, jobsPages } = useJobsListPaging(jobsList, {
  match: (job) => runtimeStore.jobs.matchesAcctJobFilters(job),
  compareSort: compareClusterAcctJobSortOrder,
  past: true
})

const jobsSubtitle = computed(
  () =>
    `Jobs finished in the last ${runtimeStore.jobs.pastHours} hour${
      runtimeStore.jobs.pastHours > 1 ? 's' : ''
    }`
)

function sortJobs() {
  /*
   * Triggered by sort emit of JobsSorter component to update route and resort
   * the jobs with the new criteria.
   */
  updateQueryParameters()
  console.log(
    `Sorting jobs by ${runtimeStore.jobs.pastSort} ordered ${runtimeStore.jobs.pastOrder}`
  )
}

function setPastHours(hours: number) {
  if (runtimeStore.jobs.pastHours === hours) return
  runtimeStore.jobs.pastHours = hours
  poller.setParam(hours)
  runtimeStore.jobs.page = 1
  updateQueryParameters()
}

watch(
  () => cluster,
  (new_cluster) => {
    poller.setCluster(new_cluster)
  }
)

/*
 * Set current page to last page if last page changes to a value lower than
 * current page.
 */
watch(lastpage, (new_last_page) => {
  runtimeStore.jobs.page = Math.min(runtimeStore.jobs.page, new_last_page)
  if (route.query.page && parseInt(route.query.page as string) > new_last_page) {
    updateQueryParameters()
  }
})

onMounted(() => {
  setupFilterQuerySync()
  // Avoid stop/restart on mount when route store already matches initial poller param.
  if (runtimeStore.jobs.pastHours !== PAST_JOBS_DEFAULT_HOURS) {
    poller.setParam(runtimeStore.jobs.pastHours)
  }
})
</script>

<template>
  <ClusterMainLayout
    menu-entry="jobs"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Jobs', routeName: 'jobs' }, { title: 'Terminated' }]"
  >
    <div>
      <JobsFiltersPanel
        :cluster="cluster"
        :nb-jobs="sortedJobs.length"
        past-time-range
        :max-past-hours="maxPastHours"
        :default-past-hours="PAST_JOBS_DEFAULT_HOURS"
        @past-hours-change="setPastHours"
      />

      <div class="mx-auto flex items-center justify-between">
        <div class="px-4 py-16 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Jobs Terminated
          </h1>
          <p class="mt-4 max-w-xl text-sm font-light text-gray-600 dark:text-gray-300">
            {{ jobsSubtitle }}
          </p>
        </div>

        <div v-if="poller.loaded.value" class="mt-4 text-right text-gray-600 dark:text-gray-300">
          <div class="text-5xl font-bold">{{ sortedJobs.length }}</div>
          <div class="text-sm font-light">job{{ sortedJobs.length > 1 ? 's' : '' }} found</div>
        </div>
        <div v-else class="flex animate-pulse space-x-4">
          <div class="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
      </div>

      <section aria-labelledby="filter-heading" class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
        <h2 id="filter-heading" class="sr-only">Filters</h2>

        <div class="border-gray-200 pb-4">
          <div class="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <JobsSorter past @sort="sortJobs" />

            <div class="flex flex-wrap items-center gap-2">
              <RouterLink
                v-if="runtimeStore.hasAnyPermission(['jobs-view', 'jobs-view-own'])"
                data-testid="jobs-scope-toggle"
                :to="{ name: 'jobs', params: { cluster } }"
                class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
              >
                <PlayIcon class="-ml-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Active
              </RouterLink>
              <button
                type="button"
                class="bg-slurmweb dark:bg-slurmweb-verydark hover:bg-slurmweb-darker focus-visible:outline-slurmweb inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                @click="runtimeStore.jobs.openFiltersPanel = true"
              >
                <PlusSmallIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
                Add filters
              </button>
            </div>
          </div>
        </div>
        <JobsFiltersBar past />
      </section>

      <div class="mt-8 flow-root">
        <ErrorAlert v-if="poller.unable.value"
          >Unable to retrieve jobs from cluster
          <span class="font-medium">{{ cluster }}</span></ErrorAlert
        >
        <div v-else-if="!poller.loaded.value" class="text-gray-400 sm:pl-6 lg:pl-8">
          <LoadingSpinner :size="5" />
          Loading jobs…
        </div>
        <InfoAlert v-else-if="sortedJobs.length == 0"
          >No jobs found on cluster <span class="font-medium">{{ cluster }}</span></InfoAlert
        >
        <div v-else class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle">
            <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-500">
              <thead>
                <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                  <th scope="col" class="w-12 py-3.5 pr-3 text-left sm:pl-6 lg:pl-8">#ID</th>
                  <th scope="col" class="w-16 px-3 py-3.5 text-left">State</th>
                  <th scope="col" class="px-3 py-3.5 text-left whitespace-nowrap">End time</th>
                  <th scope="col" class="px-3 py-3.5 text-left">User (account)</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-left sm:table-cell">Resources</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-left xl:table-cell">Partition</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-left xl:table-cell">QOS</th>
                  <th scope="col" class="max-w-fit py-3.5 pr-4 pl-3 sm:pr-6 lg:pr-8">
                    <span class="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody
                class="divide-y divide-gray-200 text-sm text-gray-500 dark:divide-gray-700 dark:text-gray-300"
              >
                <tr v-for="job in sortedJobs.slice(firstjob, lastjob)" :key="job.job_id">
                  <td
                    class="py-4 pr-3 font-medium whitespace-nowrap text-gray-900 sm:pl-6 lg:pl-8 dark:text-gray-100"
                  >
                    {{ job.job_id }}
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">
                    <JobStatusBadge :status="acctJobStates(job)" />
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">{{ formatAcctJobEndTime(job) }}</td>
                  <td class="px-3 py-4 whitespace-nowrap">{{ job.user }} ({{ job.account }})</td>
                  <td class="hidden px-3 py-4 whitespace-nowrap sm:table-cell">
                    <AcctJobResources :job="job" />
                  </td>
                  <td class="hidden px-3 py-4 whitespace-nowrap xl:table-cell">
                    {{ job.partition }}
                  </td>
                  <td class="hidden px-3 py-4 whitespace-nowrap xl:table-cell">
                    {{ job.qos }}
                  </td>
                  <td class="h-full text-right font-medium">
                    <RouterLink
                      :to="{ name: 'job', params: { cluster: cluster, id: job.job_id } }"
                      class="hover:text-slurmweb-dark hover:dark:text-slurmweb"
                    >
                      <WindowIcon class="mr-4 inline-block h-5 w-5 lg:mr-6" aria-hidden="true" />
                      <span class="sr-only">View {{ job.job_id }}</span>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              class="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-700"
            >
              <div class="flex flex-1 justify-between sm:hidden">
                <a
                  href="#"
                  class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:dark:bg-gray-600"
                  >Previous</a
                >
                <a
                  href="#"
                  class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:dark:bg-gray-600"
                  >Next</a
                >
              </div>
              <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    Showing
                    {{ ' ' }}
                    <span class="font-medium">{{ firstjob }}</span>
                    {{ ' ' }}
                    to
                    {{ ' ' }}
                    <span class="font-medium">{{ lastjob }}</span>
                    {{ ' ' }}
                    of
                    {{ ' ' }}
                    <span class="font-medium">{{ sortedJobs.length }}</span>
                    {{ ' ' }} jobs
                  </p>
                </div>
                <div>
                  <nav
                    v-if="lastpage > 1"
                    class="isolate inline-flex -space-x-px rounded-md shadow-xs"
                    aria-label="Pagination"
                  >
                    <button
                      :class="[
                        runtimeStore.jobs.page == 1
                          ? 'cursor-default bg-gray-100 text-gray-100 dark:bg-gray-900 dark:text-gray-900'
                          : 'text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 hover:dark:bg-gray-700',
                        'relative inline-flex items-center rounded-l-md px-2 py-2 ring-1 ring-gray-300 ring-inset focus:z-20 focus:outline-offset-0 dark:ring-gray-700'
                      ]"
                      @click="runtimeStore.jobs.page > 1 && (runtimeStore.jobs.page -= 1)"
                    >
                      <span class="sr-only">Previous</span>
                      <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
                    </button>
                    <template v-for="page in jobsPages()" :key="page.id">
                      <button
                        v-if="page.ellipsis"
                        aria-current="page"
                        class="relative z-10 inline-flex items-center bg-white px-4 py-2 text-xs font-semibold text-gray-600 ring-1 ring-gray-300 ring-inset focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-gray-800 dark:ring-gray-700"
                      >
                        …
                      </button>
                      <button
                        v-else
                        aria-current="page"
                        :class="[
                          page.id == runtimeStore.jobs.page
                            ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
                            : 'bg-white text-black ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 hover:dark:bg-gray-700',
                          'relative z-10 inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        ]"
                        @click="runtimeStore.jobs.page = page.id"
                      >
                        {{ page.id }}
                      </button>
                    </template>
                    <button
                      :class="[
                        runtimeStore.jobs.page == lastpage
                          ? 'cursor-default bg-gray-100 text-gray-100 dark:bg-gray-900 dark:text-gray-900'
                          : 'text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 hover:dark:bg-gray-700',
                        'relative inline-flex items-center rounded-r-md px-2 py-2 ring-1 ring-gray-300 ring-inset focus:z-20 focus:outline-offset-0 dark:ring-gray-700'
                      ]"
                      @click="runtimeStore.jobs.page < lastpage && (runtimeStore.jobs.page += 1)"
                    >
                      <span class="sr-only">Next</span>
                      <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
