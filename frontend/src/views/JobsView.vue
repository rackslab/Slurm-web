<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import type { JobSortCriterion, JobSortOrder } from '@/stores/runtime'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterJob } from '@/composables/GatewayAPI'
import JobsSorter from '@/components/jobs/JobsSorter.vue'
import JobStatusLabel from '@/components/jobs/JobStatusLabel.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import UserFilterSelector from '@/components/jobs/UserFilterSelector.vue'
import AccountFilterSelector from '@/components/jobs/AccountFilterSelector.vue'
import QosFilterSelector from '@/components/jobs/QosFilterSelector.vue'
import PartitionFilterSelector from '@/components/jobs/PartitionFilterSelector.vue'

import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import { XMarkIcon, PlusSmallIcon, FolderArrowDownIcon } from '@heroicons/vue/24/outline'
import {
  ChevronDownIcon,
  FunnelIcon,
  BoltIcon,
  UserIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SwatchIcon,
  RectangleGroupIcon
} from '@heroicons/vue/20/solid'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const state_filters = [
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'pending', label: 'Pending' }
]

const open = ref(false)
const route = useRoute()
const { data, unable, loaded } = useClusterDataPoller<ClusterJob[]>('jobs', 5000, props)

const sortedJobs = computed(() => {
  console.log(`Computing sorted jobs by ${runtimeStore.jobs.sort}`)
  if (data.value) {
    // https://vuejs.org/guide/essentials/list.html#displaying-filtered-sorted-results
    let result = [...data.value].filter((job) => {
      return runtimeStore.jobs.matchesFilters(job)
    })
    result = result.sort((a, b) => {
      if (runtimeStore.jobs.sort == 'user') {
        if (a.user_name > b.user_name) {
          return runtimeStore.jobs.order == 'asc' ? 1 : -1
        }
        if (a.user_name < b.user_name) {
          return runtimeStore.jobs.order == 'asc' ? -1 : 1
        }
        return 0
      } else if (runtimeStore.jobs.sort == 'state') {
        if (a.job_state > b.job_state) {
          return runtimeStore.jobs.order == 'asc' ? 1 : -1
        }
        if (a.job_state < b.job_state) {
          return runtimeStore.jobs.order == 'asc' ? -1 : 1
        }
        return 0
      } else if (runtimeStore.jobs.sort == 'priority') {
        if (!a.priority.set) {
          if (b.priority.set) {
            return runtimeStore.jobs.order == 'asc' ? -1 : 1
          }
          return 0
        }
        if (!b.priority.set) {
          return runtimeStore.jobs.order == 'asc' ? 1 : -1
        }
        if (a.priority.infinite) {
          if (!b.priority.infinite) {
            return runtimeStore.jobs.order == 'asc' ? 1 : -1
          }
          return 0
        }
        if (a.priority.number > b.priority.number) {
          return runtimeStore.jobs.order == 'asc' ? 1 : -1
        }
        if (a.priority.number < b.priority.number) {
          return runtimeStore.jobs.order == 'asc' ? -1 : 1
        }
        return 0
      } else {
        // by default, sort by id
        if (a.job_id > b.job_id) {
          return runtimeStore.jobs.order == 'asc' ? 1 : -1
        }
        if (a.job_id < b.job_id) {
          return runtimeStore.jobs.order == 'asc' ? -1 : 1
        }
        return 0
      }
    })
    return result
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

function sortJobs() {
  /*
   * Triggered by sort emit of JobsSorter component to update route and resort
   * the jobs with the new criteria.
   */
  updateQueryParameters()
  console.log(`Sorting jobs by ${runtimeStore.jobs.sort} ordered ${runtimeStore.jobs.order}`)
}

function updateQueryParameters() {
  console.log('Updating query parameters')
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
  let result: Page[] = Array()
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
  <ClusterMainLayout :cluster="props.cluster" title="Jobs">
    <div class="bg-white">
      <!-- Mobile filter dialog -->
      <TransitionRoot as="template" :show="open">
        <Dialog as="div" class="relative z-40" @close="open = false">
          <TransitionChild
            as="template"
            enter="transition-opacity ease-linear duration-300"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black bg-opacity-25" />
          </TransitionChild>

          <div class="fixed inset-0 z-40 flex">
            <TransitionChild
              as="template"
              enter="transition ease-in-out duration-300 transform"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <DialogPanel
                class="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl"
              >
                <div class="flex items-center justify-between px-4">
                  <h2 class="text-lg font-medium text-gray-900">
                    Filters
                    <span
                      class="ml-3 hidden rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-slurmweb md:inline-block"
                      >{{ sortedJobs.length }}</span
                    >
                  </h2>
                  <button
                    type="button"
                    class="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
                    @click="open = false"
                  >
                    <span class="sr-only">Close menu</span>
                    <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <!-- Filters -->
                <form class="mt-4">
                  <Disclosure as="div" class="border-t border-gray-200 px-4 py-6" v-slot="{ open }">
                    <h3 class="-mx-2 -my-3 flow-root">
                      <DisclosureButton
                        class="flex w-full items-center justify-between bg-white px-2 py-3 text-sm text-gray-400"
                      >
                        <span class="flex">
                          <BoltIcon
                            class="-ml-1 -mt-1 mr-2 h-8 w-8 rounded-full bg-gray-600 p-2 text-white"
                          />
                          <span class="font-medium text-gray-900">State</span>
                        </span>
                        <span class="ml-6 flex items-center">
                          <ChevronDownIcon
                            :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                            aria-hidden="true"
                          />
                        </span>
                      </DisclosureButton>
                    </h3>
                    <DisclosurePanel class="pt-6">
                      <div class="space-y-6">
                        <div
                          v-for="(state, optionIdx) in state_filters"
                          :key="state.value"
                          class="flex items-center"
                        >
                          <input
                            :id="`filter-mobile-${state.value}-${optionIdx}`"
                            :name="`state-${state.value}[]`"
                            :value="state.value"
                            type="checkbox"
                            v-model="runtimeStore.jobs.filters.states"
                            class="h-4 w-4 rounded border-gray-300 text-slurmweb focus:ring-slurmweb"
                          />
                          <label
                            :for="`filter-mobile-${state.value}-${optionIdx}`"
                            class="ml-3 text-sm text-gray-500"
                            >{{ state.label }}</label
                          >
                        </div>
                      </div>
                    </DisclosurePanel>
                  </Disclosure>
                  <Disclosure
                    as="div"
                    class="border-t border-t-gray-200 px-4 py-6"
                    v-slot="{ open }"
                  >
                    <h3 class="-mx-2 -my-3 flow-root">
                      <DisclosureButton
                        class="flex w-full items-center justify-between bg-white px-2 py-3 text-sm text-gray-400"
                      >
                        <span class="flex">
                          <UserIcon
                            class="-ml-1 -mt-1 mr-2 h-8 w-8 rounded-full bg-emerald-500 p-2 text-white"
                          />
                          <span class="font-medium text-gray-900">Users</span>
                        </span>
                        <span class="ml-6 flex items-center">
                          <ChevronDownIcon
                            :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                            aria-hidden="true"
                          />
                        </span>
                      </DisclosureButton>
                    </h3>
                    <DisclosurePanel class="pt-6">
                      <UserFilterSelector />
                    </DisclosurePanel>
                  </Disclosure>
                  <Disclosure
                    v-if="runtimeStore.hasPermission('view-accounts')"
                    as="div"
                    class="border-t border-t-gray-200 px-4 py-6"
                    v-slot="{ open }"
                  >
                    <h3 class="-mx-2 -my-3 flow-root">
                      <DisclosureButton
                        class="flex w-full items-center justify-between bg-white px-2 py-3 text-sm text-gray-400"
                      >
                        <span class="flex">
                          <UsersIcon
                            class="-ml-1 -mt-1 mr-2 h-8 w-8 rounded-full bg-yellow-500 p-2 text-white"
                          />
                          <span class="font-medium text-gray-900">Accounts</span>
                        </span>
                        <span class="ml-6 flex items-center">
                          <ChevronDownIcon
                            :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                            aria-hidden="true"
                          />
                        </span>
                      </DisclosureButton>
                    </h3>
                    <DisclosurePanel class="pt-6">
                      <AccountFilterSelector :cluster="props.cluster" />
                    </DisclosurePanel>
                  </Disclosure>
                  <Disclosure
                    v-if="runtimeStore.hasPermission('view-qos')"
                    as="div"
                    class="border-t border-t-gray-200 px-4 py-6"
                    v-slot="{ open }"
                  >
                    <h3 class="-mx-2 -my-3 flow-root">
                      <DisclosureButton
                        class="flex w-full items-center justify-between bg-white px-2 py-3 text-sm text-gray-400"
                      >
                        <span class="flex">
                          <SwatchIcon
                            class="-ml-1 -mt-1 mr-2 h-8 w-8 rounded-full bg-purple-500 p-2 text-white"
                          />
                          <span class="font-medium text-gray-900">QOS</span>
                        </span>
                        <span class="ml-6 flex items-center">
                          <ChevronDownIcon
                            :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                            aria-hidden="true"
                          />
                        </span>
                      </DisclosureButton>
                    </h3>
                    <DisclosurePanel class="pt-6">
                      <QosFilterSelector :cluster="props.cluster" />
                    </DisclosurePanel>
                  </Disclosure>
                  <Disclosure
                    v-if="runtimeStore.hasPermission('view-partitions')"
                    as="div"
                    class="border-t border-t-gray-200 px-4 py-6"
                    v-slot="{ open }"
                  >
                    <h3 class="-mx-2 -my-3 flow-root">
                      <DisclosureButton
                        class="flex w-full items-center justify-between bg-white px-2 py-3 text-sm text-gray-400"
                      >
                        <span class="flex">
                          <RectangleGroupIcon
                            class="-ml-1 -mt-1 mr-2 h-8 w-8 rounded-full bg-amber-700 p-2 text-white"
                          />
                          <span class="font-medium text-gray-900">Partitions</span>
                        </span>
                        <span class="ml-6 flex items-center">
                          <ChevronDownIcon
                            :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                            aria-hidden="true"
                          />
                        </span>
                      </DisclosureButton>
                    </h3>
                    <DisclosurePanel class="pt-6">
                      <PartitionFilterSelector :cluster="props.cluster" />
                    </DisclosurePanel>
                  </Disclosure>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </TransitionRoot>

      <div class="mx-auto flex items-center justify-between">
        <div class="px-4 py-16 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Jobs</h1>
          <p class="mt-4 max-w-xl text-sm font-light text-gray-600">Jobs in cluster queue</p>
        </div>

        <div v-if="loaded" class="mt-4 text-right text-gray-600">
          <div class="text-5xl font-bold">{{ sortedJobs.length }}</div>
          <div class="text-sm font-light">job{{ sortedJobs.length > 1 ? 's' : '' }} found</div>
        </div>
        <div v-else class="flex animate-pulse space-x-4">
          <div class="h-14 w-14 rounded-2xl bg-slate-200"></div>
        </div>
      </div>

      <section aria-labelledby="filter-heading" class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
        <h2 id="filter-heading" class="sr-only">Filters</h2>

        <div class="border-gray-200 bg-white pb-4">
          <div class="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <JobsSorter @sort="sortJobs" />

            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-slurmweb px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-darker focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb"
              @click="open = true"
            >
              <PlusSmallIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
              Add filters
            </button>
          </div>
        </div>

        <!-- Active filters -->
        <div v-show="!runtimeStore.jobs.emptyFilters()" class="bg-gray-100">
          <div class="mx-auto px-4 py-3 sm:flex sm:items-center sm:px-6 lg:px-8">
            <h3 class="text-sm font-medium text-gray-500">
              <FunnelIcon class="mr-1 h-4 w-4" />
              <span class="sr-only">Filters active</span>
            </h3>

            <div aria-hidden="true" class="hidden h-5 w-px bg-gray-300 sm:ml-4 sm:block" />

            <div class="mt-2 sm:ml-4 sm:mt-0">
              <div class="-m-1 flex flex-wrap items-center">
                <span
                  v-for="activeStateFilter in runtimeStore.jobs.filters.states"
                  :key="activeStateFilter"
                  class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-gray-600 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
                >
                  <BoltIcon class="mr-1 h-4 w-4" />
                  <span>{{ activeStateFilter }}</span>
                  <button
                    type="button"
                    class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-500"
                    @click="runtimeStore.jobs.removeStateFilter(activeStateFilter)"
                  >
                    <span class="sr-only">Remove filter for state:{{ activeStateFilter }}</span>
                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
                <span
                  v-for="activeUserFilter in runtimeStore.jobs.filters.users"
                  :key="activeUserFilter"
                  class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-emerald-500 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
                >
                  <UserIcon class="mr-1 h-4 w-4" />
                  <span>{{ activeUserFilter }}</span>
                  <button
                    type="button"
                    class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-emerald-600 hover:bg-emerald-600 hover:text-emerald-700"
                    @click="runtimeStore.jobs.removeUserFilter(activeUserFilter)"
                  >
                    <span class="sr-only">Remove filter for user:{{ activeUserFilter }}</span>
                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
                <span
                  v-for="activeAccountFilter in runtimeStore.jobs.filters.accounts"
                  :key="activeAccountFilter"
                  class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-yellow-500 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
                >
                  <UsersIcon class="mr-1 h-4 w-4" />
                  <span>{{ activeAccountFilter }}</span>
                  <button
                    type="button"
                    class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-yellow-600 hover:bg-yellow-600 hover:text-yellow-700"
                    @click="runtimeStore.jobs.removeAccountFilter(activeAccountFilter)"
                  >
                    <span class="sr-only">Remove filter for account:{{ activeAccountFilter }}</span>
                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
                <span
                  v-for="activeQosFilter in runtimeStore.jobs.filters.qos"
                  :key="activeQosFilter"
                  class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-purple-500 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
                >
                  <SwatchIcon class="mr-1 h-4 w-4" />
                  <span>{{ activeQosFilter }}</span>
                  <button
                    type="button"
                    class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-purple-600 hover:bg-purple-600 hover:text-purple-700"
                    @click="runtimeStore.jobs.removeQosFilter(activeQosFilter)"
                  >
                    <span class="sr-only">Remove filter for qos:{{ activeQosFilter }}</span>
                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
                <span
                  v-for="activePartitionFilter in runtimeStore.jobs.filters.partitions"
                  :key="activePartitionFilter"
                  class="m-1 inline-flex items-center rounded-full border border-gray-200 bg-amber-700 py-1.5 pl-3 pr-2 text-sm font-medium text-white"
                >
                  <RectangleGroupIcon class="mr-1 h-4 w-4" />
                  <span>{{ activePartitionFilter }}</span>
                  <button
                    type="button"
                    class="ml-1 inline-flex h-4 w-4 flex-shrink-0 rounded-full p-1 text-amber-800 hover:bg-amber-800 hover:text-amber-900"
                    @click="runtimeStore.jobs.removePartitionFilter(activePartitionFilter)"
                  >
                    <span class="sr-only"
                      >Remove filter for partition:{{ activePartitionFilter }}</span
                    >
                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="mt-8 flow-root">
        <div v-if="unable">Unable to get jobs</div>
        <div v-else-if="!loaded" class="mx-4">Loading jobs…</div>
        <div v-else-if="sortedJobs.length" class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle">
            <table class="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    class="w-12 py-3.5 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 lg:pl-8"
                  >
                    #ID
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    State
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    User
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Account
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Partition
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    QOS
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Reason
                  </th>
                  <th scope="col" class="max-w-fit py-3.5 pl-3 pr-4 sm:pr-6 lg:pr-8">
                    <span class="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="job in sortedJobs.slice(firstjob, lastjob)" :key="job.job_id">
                  <td
                    class="whitespace-nowrap py-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8"
                  >
                    {{ job.job_id }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <JobStatusLabel :status="job.job_state" />
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ job.user_name }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ job.account }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ job.partition }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ job.qos }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <template v-if="job.state_reason != 'None'">
                      {{ job.state_reason }}
                    </template>
                  </td>
                  <td
                    class="max-w-fit whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 lg:pr-8"
                  >
                    <RouterLink
                      :to="{ name: 'job', params: { cluster: cluster, id: job.job_id } }"
                      class="text-slurmweb hover:text-slurmweb-dark"
                    >
                      View
                      <span class="sr-only">, {{ job.job_id }}</span>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
            >
              <div class="flex flex-1 justify-between sm:hidden">
                <a
                  href="#"
                  class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >Previous</a
                >
                <a
                  href="#"
                  class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >Next</a
                >
              </div>
              <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
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
                    class="isolate inline-flex -space-x-px rounded-md shadow-sm"
                    aria-label="Pagination"
                  >
                    <button
                      :class="[
                        runtimeStore.jobs.page == 1
                          ? 'cursor-default bg-gray-100 text-gray-100'
                          : 'text-gray-400 hover:bg-gray-50',
                        'relative inline-flex items-center rounded-l-md px-2 py-2  ring-1 ring-inset ring-gray-300  focus:z-20 focus:outline-offset-0'
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
                        class="relative z-10 inline-flex items-center bg-white px-4 py-2 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-300 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        …
                      </button>
                      <button
                        v-else
                        aria-current="page"
                        :class="[
                          page.id == runtimeStore.jobs.page
                            ? 'bg-slurmweb text-white'
                            : 'bg-white text-black ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
                          'relative z-10 inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        ]"
                        @click="runtimeStore.jobs.page = page.id"
                      >
                        {{ page.id }}
                      </button>
                    </template>
                    <button
                      :class="[
                        runtimeStore.jobs.page == lastpage
                          ? 'cursor-default bg-gray-100 text-gray-100'
                          : 'text-gray-400 hover:bg-gray-50',
                        'relative inline-flex items-center rounded-r-md px-2 py-2 ring-1 ring-inset ring-gray-300  focus:z-20 focus:outline-offset-0'
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
        <div v-else>No job to display</div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
