<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import type { JobSortCriterion, JobSortOrder } from '@/stores/runtime/jobs'
import { useClusterDataPoller } from '@/composables/DataPoller'
import { compareClusterJobSortOrder } from '@/composables/GatewayAPI'
import type { ClusterJob } from '@/composables/GatewayAPI'
import JobsSorter from '@/components/jobs/JobsSorter.vue'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import JobsFiltersPanel from '@/components/jobs/JobsFiltersPanel.vue'
import JobsFiltersBar from '@/components/jobs/JobsFiltersBar.vue'
import JobResources from '@/components/jobs/JobResources.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import { PlusSmallIcon, WindowIcon } from '@heroicons/vue/24/outline'

const { cluster } = defineProps<{ cluster: string }>()

const route = useRoute()
const { data, unable, loaded, setCluster } = useClusterDataPoller<ClusterJob[]>(
  cluster,
  'jobs',
  5000
)

function compareClusterJob(a: ClusterJob, b: ClusterJob): number {
  return compareClusterJobSortOrder(a, b, runtimeStore.jobs.sort, runtimeStore.jobs.order)
}

const sortedJobs = computed(() => {
  if (data.value) {
    // https://vuejs.org/guide/essentials/list.html#displaying-filtered-sorted-results
    const result = [...data.value].filter((job) => {
      return runtimeStore.jobs.matchesFilters(job)
    })
    return result.sort(compareClusterJob)
  } else {
    return []
  }
})

const lastpage = computed(() => {
  return Math.max(Math.ceil(sortedJobs.value.length / 100), 1)
})
const firstjob = computed(() => {
  return (runtimeStore.jobs.page - 1) * 100
})
const lastjob = computed(() => {
  return Math.min(firstjob.value + 100, sortedJobs.value.length)
})

const router = useRouter()

const runtimeStore = useRuntimeStore()

function jobPriority(job: ClusterJob): string {
  if (!job.job_state.includes('PENDING')) return '-'
  if (job.priority.set) {
    if (job.priority.infinite) {
      return '∞'
    }
    return job.priority.number.toString()
  }
  return '∅'
}

function sortJobs() {
  /*
   * Triggered by sort emit of JobsSorter component to update route and resort
   * the jobs with the new criteria.
   */
  updateQueryParameters()
  console.log(`Sorting jobs by ${runtimeStore.jobs.sort} ordered ${runtimeStore.jobs.order}`)
}

function updateQueryParameters() {
  router.push({ name: 'jobs', query: runtimeStore.jobs.query() as LocationQueryRaw })
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
  () => runtimeStore.jobs.filters.states,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => runtimeStore.jobs.filters.users,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => runtimeStore.jobs.filters.accounts,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => runtimeStore.jobs.filters.qos,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => runtimeStore.jobs.filters.partitions,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => runtimeStore.jobs.page,
  () => {
    updateQueryParameters()
  }
)
watch(
  () => cluster,
  (new_cluster) => {
    setCluster(new_cluster)
  }
)

/*
 * Set current page to last page if last page changes to a value lower than
 * current page.
 */
watch(lastpage, (new_last_page) => {
  console.log(`lastpage changed ${new_last_page}`)
  runtimeStore.jobs.page = Math.min(runtimeStore.jobs.page, new_last_page)
  if (route.query.page && parseInt(route.query.page as string) > new_last_page) {
    updateQueryParameters()
  }
})

interface Page {
  id: number
  ellipsis: boolean
}

function jobsPages(): Page[] {
  const result: Page[] = []
  let ellipsis = false
  range(1, lastpage.value, 1).forEach((page) => {
    if (
      page < 3 ||
      page > lastpage.value - 2 ||
      (page >= runtimeStore.jobs.page - 1 && page <= runtimeStore.jobs.page + 1)
    ) {
      ellipsis = false
      result.push({ id: page, ellipsis: false })
    } else if (ellipsis === false) {
      ellipsis = true
      result.push({ id: page, ellipsis: true })
    }
  })
  return result
}

const range = (start: number, stop: number, step: number) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)

onMounted(() => {
  if (
    ['sort', 'states', 'users', 'accounts', 'page', 'qos', 'partitions'].some(
      (parameter) => parameter in route.query
    )
  ) {
    if (route.query.sort && runtimeStore.jobs.isValidSortCriterion(route.query.sort)) {
      /* Retrieve the sort criteria from query and update the store */
      runtimeStore.jobs.sort = route.query.sort as JobSortCriterion
    }
    if (route.query.order && runtimeStore.jobs.isValidSortOrder(route.query.order)) {
      /* Retrieve the sort order from query and update the store */
      runtimeStore.jobs.order = route.query.order as JobSortOrder
    }
    if (route.query.page) {
      /* Retrieve the page number from query and update the store. If the
       * lastpage is lower than the page query, set store to lastpage and update
       * query parameters. */
      //console.log(`lastpage ${lastpage.value}`)
      runtimeStore.jobs.page = parseInt(route.query.page as string)
      /*
      if (lastpage.value < runtimeStore.jobs.page) {
        runtimeStore.jobs.page = lastpage.value
        updateQueryParameters()
      }
      */
    }
    if (route.query.states) {
      /* Retrieve the states filters from query and update the store */
      runtimeStore.jobs.filters.states = (route.query.states as string).split(',')
    }
    if (route.query.users) {
      /* Retrieve the users filters from query and update the store */
      runtimeStore.jobs.filters.users = (route.query.users as string).split(',')
    }
    if (route.query.accounts) {
      /* Retrieve the account filters from query and update the store */
      runtimeStore.jobs.filters.accounts = (route.query.accounts as string).split(',')
    }
    if (route.query.qos) {
      /* Retrieve the qos filters from query and update the store */
      runtimeStore.jobs.filters.qos = (route.query.qos as string).split(',')
    }
    if (route.query.partitions) {
      /* Retrieve the partitions filters from query and update the store */
      runtimeStore.jobs.filters.partitions = (route.query.partitions as string).split(',')
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
  <ClusterMainLayout menu-entry="jobs" :cluster="cluster" :breadcrumb="[{ title: 'Jobs' }]">
    <div>
      <JobsFiltersPanel :cluster="cluster" :nb-jobs="sortedJobs.length" />
      <div class="mx-auto flex items-center justify-between">
        <div class="px-4 py-16 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Jobs</h1>
          <p class="mt-4 max-w-xl text-sm font-light text-gray-600 dark:text-gray-300">
            Jobs in cluster queue
          </p>
        </div>

        <div v-if="loaded" class="mt-4 text-right text-gray-600 dark:text-gray-300">
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
            <JobsSorter @sort="sortJobs" />

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
        <JobsFiltersBar />
      </section>

      <div class="mt-8 flow-root">
        <ErrorAlert v-if="unable"
          >Unable to retrieve jobs from cluster
          <span class="font-medium">{{ cluster }}</span></ErrorAlert
        >
        <div v-else-if="!loaded" class="text-gray-400 sm:pl-6 lg:pl-8">
          <LoadingSpinner :size="5" />
          Loading jobs…
        </div>
        <InfoAlert v-else-if="data?.length == 0"
          >No jobs found on cluster <span class="font-medium">{{ cluster }}</span></InfoAlert
        >
        <div v-else class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle">
            <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-500">
              <thead>
                <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                  <th scope="col" class="w-12 py-3.5 pr-3 text-left sm:pl-6 lg:pl-8">#ID</th>
                  <th scope="col" class="w-16 px-3 py-3.5 text-left">State</th>
                  <th scope="col" class="px-3 py-3.5 text-left">User (account)</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-left sm:table-cell">Resources</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-left xl:table-cell">Partition</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-left xl:table-cell">QOS</th>
                  <th scope="col" class="hidden px-3 py-3.5 text-center sm:table-cell">Priority</th>
                  <th
                    scope="col"
                    class="hidden px-3 py-3.5 text-left 2xl:table-cell 2xl:min-w-[100px]"
                  >
                    Reason
                  </th>
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
                    <JobStatusBadge :status="job.job_state" />
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">
                    {{ job.user_name }} ({{ job.account }})
                  </td>
                  <td class="hidden px-3 py-4 whitespace-nowrap sm:table-cell">
                    <JobResources :job="job" />
                  </td>
                  <td class="hidden px-3 py-4 whitespace-nowrap xl:table-cell">
                    {{ job.partition }}
                  </td>
                  <td class="hidden px-3 py-4 whitespace-nowrap xl:table-cell">
                    {{ job.qos }}
                  </td>
                  <td class="hidden px-3 py-4 text-center whitespace-nowrap sm:table-cell">
                    {{ jobPriority(job) }}
                  </td>
                  <td class="hidden px-3 py-4 whitespace-nowrap 2xl:table-cell">
                    <template v-if="job.state_reason != 'None'">
                      {{ job.state_reason }}
                    </template>
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
