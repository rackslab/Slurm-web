<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterAssociation } from '@/composables/GatewayAPI'
import {
  renderClusterOptionalNumber,
  renderClusterTRES,
  renderWalltime
} from '@/composables/GatewayAPI'

const { cluster, account } = defineProps<{
  cluster: string
  account: string
}>()

const router = useRouter()
const { data, unable, loaded, setCluster } = useClusterDataPoller<ClusterAssociation[]>(
  cluster,
  'associations',
  120000
)

watch(
  () => cluster,
  (newCluster) => {
    setCluster(newCluster)
  }
)

/* Find account-level association (without user) */
const accountAssociation = computed<ClusterAssociation | undefined>(() => {
  if (!data.value) {
    return undefined
  }
  return data.value.find((association) => association.account === account && !association.user)
})

/* Build parent account breadcrumb */
const parentBreadcrumb = computed(() => {
  if (!data.value || !accountAssociation.value) {
    return []
  }
  const breadcrumb: string[] = []
  let currentAccount = accountAssociation.value.parent_account
  const accountMap = new Map<string, ClusterAssociation>()

  // Build map of all account-level associations
  for (const assoc of data.value) {
    if (!assoc.user && assoc.account) {
      accountMap.set(assoc.account, assoc)
    }
  }

  // Traverse up to root
  while (currentAccount && accountMap.has(currentAccount)) {
    breadcrumb.unshift(currentAccount)
    const parentAssoc = accountMap.get(currentAccount)!
    currentAccount = parentAssoc.parent_account
  }

  return breadcrumb
})

/* Find subaccounts (accounts where parent_account === current account) */
const subaccounts = computed(() => {
  if (!data.value) {
    return []
  }
  const subaccountsList: string[] = []
  const seen = new Set<string>()

  for (const assoc of data.value) {
    if (!assoc.user && assoc.parent_account === account && !seen.has(assoc.account)) {
      subaccountsList.push(assoc.account)
      seen.add(assoc.account)
    }
  }

  return subaccountsList.sort()
})

/* User associations directly attached to this account */
const userAssociations = computed(() => {
  if (!data.value) {
    return []
  }
  return data.value
    .filter((association) => association.account === account && association.user)
    .sort((a, b) => (a.user ?? '').localeCompare(b.user ?? ''))
})

/* Check if the account is known to the cluster */
const accountKnown = computed(() => {
  if (!data.value) {
    return false
  }
  return data.value.some((association) => association.account === account)
})

function qosLabel(list: string[]): string {
  if (!list || list.length === 0) {
    return '∅'
  }
  return list.join(', ')
}

const jobLimits = computed(() => {
  if (!accountAssociation.value) {
    return []
  }
  const account = accountAssociation.value
  return [
    { id: 'GrpJobs', label: 'Running', value: account.max.jobs.per.count },
    { id: 'GrpSubmit', label: 'Submitted', value: account.max.jobs.per.submitted },
    { id: 'MaxJobs', label: 'Running / user', value: account.max.jobs.active },
    { id: 'MaxSubmit', label: 'Submitted / user', value: account.max.jobs.total }
  ]
})

const resourceLimits = computed(() => {
  if (!accountAssociation.value) {
    return []
  }
  const account = accountAssociation.value
  return [
    { id: 'GrpTRES', label: 'Total', value: account.max.tres.total },
    { id: 'MaxTRES', label: 'Per job', value: account.max.tres.per.job },
    { id: 'MaxTRESPerNode', label: 'Per node', value: account.max.tres.per.node }
  ]
})

const timeLimits = computed(() => {
  if (!accountAssociation.value) {
    return []
  }
  const account = accountAssociation.value
  return [
    { id: 'GrpWall', label: 'Total', value: account.max.per.account.wall_clock },
    { id: 'MaxWall', label: 'Per job', value: account.max.jobs.per.wall_clock }
  ]
})

function userJobLimits(association: ClusterAssociation) {
  if (!accountAssociation.value) {
    return []
  }
  const account = accountAssociation.value
  return [
    {
      id: 'MaxJobs',
      label: 'Running / user',
      value: association.max.jobs.active,
      different: !compareOptionalNumber(association.max.jobs.active, account.max.jobs.active)
    },
    {
      id: 'MaxSubmit',
      label: 'Submitted / user',
      value: association.max.jobs.total,
      different: !compareOptionalNumber(association.max.jobs.total, account.max.jobs.total)
    }
  ]
}

function userResourceLimits(association: ClusterAssociation) {
  if (!accountAssociation.value) {
    return []
  }
  const account = accountAssociation.value
  return [
    {
      id: 'GrpTRES',
      label: 'Total',
      value: association.max.tres.total,
      different: !compareTRES(association.max.tres.total, account.max.tres.total, true)
    },
    {
      id: 'MaxTRES',
      label: 'Per job',
      value: association.max.tres.per.job,
      different: !compareTRES(association.max.tres.per.job, account.max.tres.per.job)
    },
    {
      id: 'MaxTRESPerNode',
      label: 'Per node',
      value: association.max.tres.per.node,
      different: !compareTRES(association.max.tres.per.node, account.max.tres.per.node)
    }
  ]
}

function userTimeLimits(association: ClusterAssociation) {
  if (!accountAssociation.value) {
    return []
  }
  const account = accountAssociation.value
  return [
    {
      id: 'GrpWall',
      label: 'Total',
      value: association.max.per.account.wall_clock,
      different: !compareOptionalNumber(
        association.max.per.account.wall_clock,
        account.max.per.account.wall_clock,
        true
      )
    },
    {
      id: 'MaxWall',
      label: 'Per job',
      value: association.max.jobs.per.wall_clock,
      different: !compareOptionalNumber(
        association.max.jobs.per.wall_clock,
        account.max.jobs.per.wall_clock
      )
    }
  ]
}

// Compare two ClusterOptionalNumber values
function compareOptionalNumber(
  a: ClusterAssociation['max']['jobs']['total'],
  b: ClusterAssociation['max']['jobs']['total'],
  acceptUnset: boolean = false
): boolean {
  if (a.set !== b.set) return acceptUnset
  if (!a.set && !b.set) return true
  if (a.infinite !== b.infinite) return false
  if (a.infinite && b.infinite) return true
  return a.number === b.number
}

// Compare two TRES arrays
function compareTRES(
  a: ClusterAssociation['max']['tres']['total'],
  b: ClusterAssociation['max']['tres']['total'],
  acceptAZero: boolean = false
): boolean {
  if (a.length === 0 && b.length !== 0) return acceptAZero
  if (a.length !== b.length) return false
  const aMap = new Map<string, number>()
  const bMap = new Map<string, number>()
  for (const t of a) {
    aMap.set(t.type, t.count)
  }
  for (const t of b) {
    bMap.set(t.type, t.count)
  }
  if (aMap.size !== bMap.size) return false
  for (const [key, value] of aMap) {
    if (bMap.get(key) !== value) return false
  }
  return true
}

// Check if user association has different QOS than account
function hasDifferentQos(userAssoc: ClusterAssociation): boolean {
  if (!accountAssociation.value) return true

  const accountQos = new Set(accountAssociation.value.qos || [])
  const userQos = new Set(userAssoc.qos || [])

  if (accountQos.size !== userQos.size) return true

  for (const qos of accountQos) {
    if (!userQos.has(qos)) return true
  }
  return false
}
</script>

<template>
  <ClusterMainLayout
    menu-entry="accounts"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Accounts', routeName: 'accounts' }, { title: `${account}` }]"
  >
    <button
      @click="router.push({ name: 'accounts', params: { cluster } })"
      type="button"
      class="bg-slurmweb dark:bg-slurmweb-verydark hover:bg-slurmweb-dark focus-visible:outline-slurmweb-dark mt-8 mb-16 inline-flex items-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
      Back to accounts
    </button>

    <ErrorAlert v-if="unable" class="mt-6">
      Unable to retrieve associations for cluster
      <span class="font-medium">{{ cluster }}</span>
    </ErrorAlert>
    <div v-else-if="!loaded" class="mt-6 text-gray-400 dark:text-gray-500">
      <LoadingSpinner :size="5" />
      Loading account details...
    </div>
    <InfoAlert v-else-if="!accountKnown" class="mt-6">
      Account <span class="font-semibold">{{ account }}</span> does not exist on this cluster.
    </InfoAlert>
    <div v-else-if="accountAssociation" id="account-heading">
      <div class="flex justify-between">
        <div class="px-4 pb-8 sm:px-0">
          <h3 class="text-base leading-7 font-semibold text-gray-900 dark:text-gray-100">
            Account {{ account }}
          </h3>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-300">
            Account information, limits, and user associations.
          </p>
        </div>
      </div>
      <div class="flex flex-wrap">
        <div class="w-full">
          <div class="border-t border-gray-100 dark:border-gray-700">
            <dl class="divide-y divide-gray-100 dark:divide-gray-700">
              <!-- Parent accounts breadcrumb -->
              <div id="parents" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Parent accounts
                </dt>
                <dd
                  class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300"
                >
                  <div
                    v-if="parentBreadcrumb.length === 0"
                    class="text-gray-400 dark:text-gray-500"
                  >
                    ∅
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <template v-for="(parent, index) in parentBreadcrumb" :key="parent">
                      <RouterLink
                        :to="{ name: 'account', params: { cluster, account: parent } }"
                        class="text-slurmweb hover:text-slurmweb-dark dark:text-slurmweb-light font-semibold"
                      >
                        {{ parent }}
                      </RouterLink>
                      <span v-if="index < parentBreadcrumb.length - 1" class="text-gray-400"
                        ><ChevronRightIcon class="h-5 w-5" aria-hidden="true"
                      /></span>
                    </template>
                  </div>
                </dd>
              </div>

              <!-- Subaccounts -->
              <div id="subaccounts" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Subaccounts
                </dt>
                <dd
                  class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300"
                >
                  <div v-if="subaccounts.length === 0" class="text-gray-400 dark:text-gray-500">
                    ∅
                  </div>
                  <div v-else class="flex flex-wrap gap-2">
                    <RouterLink
                      v-for="subaccount in subaccounts"
                      :key="subaccount"
                      :to="{ name: 'account', params: { cluster, account: subaccount } }"
                      class="bg-slurmweb hover:bg-slurmweb-dark focus:bg-slurmweb-dark dark:bg-slurmweb-dark dark:text-slurmweb-light focus:outline-slurmweb-dark rounded-md px-2 py-1 text-sm font-semibold text-white"
                    >
                      {{ subaccount }}
                    </RouterLink>
                  </div>
                </dd>
              </div>

              <!-- QOS directly attached to account -->
              <div id="qos" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">QoS</dt>
                <dd
                  class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300"
                >
                  {{ qosLabel(accountAssociation.qos) }}
                </dd>
              </div>

              <!-- Job limits -->
              <div id="limits-jobs" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Job limits
                </dt>
                <dd
                  class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300"
                >
                  <div v-if="jobLimits.length === 0" class="text-gray-400 dark:text-gray-500">
                    ∅
                  </div>
                  <dl v-else>
                    <div
                      v-for="limit in jobLimits"
                      :key="limit.id"
                      class="flex items-baseline leading-relaxed"
                    >
                      <dt class="text-gray-500 dark:text-gray-400">{{ limit.label }}:</dt>
                      <dd class="ml-2">
                        {{ renderClusterOptionalNumber(limit.value) }}
                      </dd>
                    </div>
                  </dl>
                </dd>
              </div>

              <!-- Resource limits -->
              <div id="limits-resources" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Resource limits
                </dt>
                <dd
                  class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300"
                >
                  <div v-if="resourceLimits.length === 0" class="text-gray-400 dark:text-gray-500">
                    ∅
                  </div>
                  <dl v-else>
                    <div
                      v-for="limit in resourceLimits"
                      :key="limit.id"
                      class="flex items-baseline leading-relaxed"
                    >
                      <dt class="text-gray-500 dark:text-gray-400">{{ limit.label }}:</dt>
                      <dd class="ml-2 font-mono">
                        {{ renderClusterTRES(limit.value) }}
                      </dd>
                    </div>
                  </dl>
                </dd>
              </div>

              <!-- Time limits -->
              <div id="limits-time" class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Time limits
                </dt>
                <dd
                  class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300"
                >
                  <div v-if="timeLimits.length === 0" class="text-gray-400 dark:text-gray-500">
                    ∅
                  </div>
                  <dl v-else>
                    <div
                      v-for="limit in timeLimits"
                      :key="limit.id"
                      class="flex items-baseline leading-relaxed"
                    >
                      <dt class="text-gray-500 dark:text-gray-400">{{ limit.label }}:</dt>
                      <dd class="font ml-2">
                        {{ renderWalltime(limit.value) }}
                      </dd>
                    </div>
                  </dl>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- User associations table -->
      <div v-if="userAssociations.length > 0" class="mt-8 flow-root">
        <div class="mt-8 flow-root">
          <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle">
              <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-500">
                <thead>
                  <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                    <th
                      scope="col"
                      class="py-3.5 pr-3 pl-6 text-left align-top lg:min-w-[250px] lg:pl-8"
                    >
                      User Associations
                    </th>
                    <th scope="col" class="hidden w-72 px-3 py-3.5 text-left sm:table-cell">
                      Job limits
                    </th>
                    <th scope="col" class="hidden w-72 px-3 py-3.5 text-left lg:table-cell">
                      Resource limits
                    </th>
                    <th scope="col" class="hidden w-72 px-3 py-3.5 text-left md:table-cell">
                      Time limits
                    </th>
                    <th
                      scope="col"
                      class="hidden w-48 px-3 py-3.5 text-left align-top 2xl:table-cell"
                    >
                      QOS
                    </th>
                  </tr>
                </thead>

                <tbody
                  class="divide-y divide-gray-200 text-sm text-gray-600 dark:divide-gray-700 dark:text-gray-300"
                >
                  <tr
                    v-for="association in userAssociations"
                    :key="`${association.account}-${association.user}`"
                  >
                    <td
                      class="py-4 pr-3 pl-4 text-sm font-semibold whitespace-nowrap text-gray-900 sm:pl-6 dark:text-gray-100"
                    >
                      {{ association.user }}
                    </td>
                    <td
                      class="hidden px-3 py-4 align-top text-sm text-gray-700 sm:table-cell dark:text-gray-300"
                    >
                      <div
                        v-if="userJobLimits(association).length === 0"
                        class="text-gray-400 dark:text-gray-500"
                      >
                        ∅
                      </div>
                      <dl v-else>
                        <div
                          v-for="limit in userJobLimits(association)"
                          :key="limit.id"
                          :class="[
                            'flex items-baseline rounded-md px-1 py-0.5 leading-relaxed',
                            limit.different ? '' : 'text-gray-300 dark:text-gray-600'
                          ]"
                        >
                          <dt :class="limit.different ? 'text-gray-500 dark:text-gray-400' : ''">
                            {{ limit.label }}:
                          </dt>
                          <dd class="ml-2">
                            {{ renderClusterOptionalNumber(limit.value) }}
                          </dd>
                        </div>
                      </dl>
                    </td>
                    <td
                      class="hidden px-3 py-4 align-top text-sm text-gray-700 lg:table-cell dark:text-gray-300"
                    >
                      <div
                        v-if="userResourceLimits(association).length === 0"
                        class="text-gray-400 dark:text-gray-500"
                      >
                        ∅
                      </div>
                      <dl v-else>
                        <div
                          v-for="limit in userResourceLimits(association)"
                          :key="limit.id"
                          :class="[
                            'flex items-baseline rounded-md px-1 py-0.5 leading-relaxed',
                            limit.different ? '' : 'text-gray-300 dark:text-gray-600'
                          ]"
                        >
                          <dt :class="limit.different ? 'text-gray-500 dark:text-gray-400' : ''">
                            {{ limit.label }}:
                          </dt>
                          <dd class="ml-2 font-mono text-xs">
                            {{ renderClusterTRES(limit.value) }}
                          </dd>
                        </div>
                      </dl>
                    </td>
                    <td
                      class="hidden px-3 py-4 align-top text-sm text-gray-700 md:table-cell dark:text-gray-300"
                    >
                      <div
                        v-if="userTimeLimits(association).length === 0"
                        class="text-gray-400 dark:text-gray-500"
                      >
                        ∅
                      </div>
                      <dl v-else>
                        <div
                          v-for="limit in userTimeLimits(association)"
                          :key="limit.id"
                          :class="[
                            'flex items-baseline rounded-md px-1 py-0.5 leading-relaxed',
                            limit.different ? '' : 'text-gray-300 dark:text-gray-600'
                          ]"
                        >
                          <dt :class="limit.different ? 'text-gray-500 dark:text-gray-400' : ''">
                            {{ limit.label }}:
                          </dt>
                          <dd class="ml-2">
                            {{ renderWalltime(limit.value) }}
                          </dd>
                        </div>
                      </dl>
                    </td>
                    <td
                      class="hidden px-3 py-4 text-sm 2xl:table-cell"
                      :class="
                        hasDifferentQos(association)
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-300 dark:text-gray-600'
                      "
                    >
                      {{ qosLabel(association.qos) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <InfoAlert v-else class="mt-6">
        Account <span class="font-semibold">{{ account }}</span> has no end-user associations.
      </InfoAlert>
    </div>
  </ClusterMainLayout>
</template>
