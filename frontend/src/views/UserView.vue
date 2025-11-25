<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterAssociation } from '@/composables/GatewayAPI'
import {
  renderClusterOptionalNumber,
  renderClusterTRES,
  renderQosLabel,
  renderWalltime
} from '@/composables/GatewayAPI'
import AccountBreadcrumb from '@/components/accounts/AccountBreadcrumb.vue'

const { cluster, user } = defineProps<{
  cluster: string
  user: string
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

/* Get user associations directly attached to this user */
const userAssociations = computed(() => {
  if (!data.value) {
    return []
  }
  return data.value
    .filter((association) => association.user === user)
    .sort((a, b) => a.account.localeCompare(b.account))
})

/* Check if the user is known to the cluster */
const knownUser = computed(() => userAssociations.value.length > 0)

/* Set containing every account associated with this user */
const associatedAccounts = computed(() => {
  const accounts = new Set<string>()
  for (const association of userAssociations.value) {
    accounts.add(association.account)
  }
  return accounts
})

function jobLimits(association: ClusterAssociation) {
  return [
    {
      id: 'MaxJobs',
      label: 'Running / user',
      value: association.max.jobs.active
    },
    {
      id: 'MaxSubmit',
      label: 'Submitted / user',
      value: association.max.jobs.total
    }
  ]
}

function resourceLimits(association: ClusterAssociation) {
  return [
    {
      id: 'GrpTRES',
      label: 'Total',
      value: association.max.tres.total
    },
    {
      id: 'MaxTRES',
      label: 'Per job',
      value: association.max.tres.per.job
    },
    {
      id: 'MaxTRESPerNode',
      label: 'Per node',
      value: association.max.tres.per.node
    }
  ]
}

function timeLimits(association: ClusterAssociation) {
  return [
    {
      id: 'GrpWall',
      label: 'Total',
      value: association.max.per.account.wall_clock
    },
    {
      id: 'MaxWall',
      label: 'Per job',
      value: association.max.jobs.per.wall_clock
    }
  ]
}
</script>

<template>
  <ClusterMainLayout
    menu-entry="accounts"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Accounts', routeName: 'accounts' }, { title: `User ${user}` }]"
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
      Loading user details...
    </div>
    <InfoAlert v-else-if="!knownUser" class="mt-6">
      User <span class="font-semibold">{{ user }}</span> has no associations on this cluster.
    </InfoAlert>
    <div v-else>
      <div id="user-heading" class="flex flex-wrap items-start justify-between gap-4">
        <div class="px-4 pb-8 sm:px-0">
          <h3 class="text-base leading-7 font-semibold text-gray-900 dark:text-gray-100">
            User {{ user }}
          </h3>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-300">
            Detailed view of every account association configured for this user.
          </p>
        </div>
        <div class="ml-auto flex flex-col items-end gap-4">
          <div class="hidden text-right sm:block">
            <div class="text-4xl font-semibold text-gray-900 dark:text-gray-100">
              {{ associatedAccounts.size }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-300">
              account{{ associatedAccounts.size > 1 ? 's' : '' }} associated
            </div>
          </div>
          <RouterLink
            :to="{ name: 'jobs', params: { cluster }, query: { users: user } }"
            class="bg-slurmweb dark:bg-slurmweb-verydark hover:bg-slurmweb-dark focus-visible:outline-slurmweb-dark inline-flex items-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            View jobs
          </RouterLink>
        </div>
      </div>

      <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle">
            <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
              <thead>
                <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                  <th
                    scope="col"
                    class="py-3.5 pr-3 pl-6 text-left align-top lg:min-w-[220px] lg:pl-8"
                  >
                    Account
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
                  <td class="py-4 pr-3 pl-4 align-top text-gray-900 sm:pl-6 dark:text-gray-100">
                    <div class="space-y-1">
                      <AccountBreadcrumb
                        :cluster="cluster"
                        :account="association.account"
                        :associations="data ?? []"
                        show-current
                      />
                    </div>
                  </td>
                  <td
                    class="hidden px-3 py-4 align-top text-sm text-gray-700 sm:table-cell dark:text-gray-300"
                  >
                    <div
                      v-if="jobLimits(association).length === 0"
                      class="text-gray-400 dark:text-gray-500"
                    >
                      ∅
                    </div>
                    <dl v-else>
                      <div
                        v-for="limit in jobLimits(association)"
                        :key="limit.id"
                        class="flex items-baseline rounded-md px-1 py-0.5 leading-relaxed"
                      >
                        <dt class="text-gray-500 dark:text-gray-400">{{ limit.label }}:</dt>
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
                      v-if="resourceLimits(association).length === 0"
                      class="text-gray-400 dark:text-gray-500"
                    >
                      ∅
                    </div>
                    <dl v-else>
                      <div
                        v-for="limit in resourceLimits(association)"
                        :key="limit.id"
                        class="flex items-baseline rounded-md px-1 py-0.5 leading-relaxed"
                      >
                        <dt class="text-gray-500 dark:text-gray-400">{{ limit.label }}:</dt>
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
                      v-if="timeLimits(association).length === 0"
                      class="text-gray-400 dark:text-gray-500"
                    >
                      ∅
                    </div>
                    <dl v-else>
                      <div
                        v-for="limit in timeLimits(association)"
                        :key="limit.id"
                        class="flex items-baseline rounded-md px-1 py-0.5 leading-relaxed"
                      >
                        <dt class="text-gray-500 dark:text-gray-400">{{ limit.label }}:</dt>
                        <dd class="ml-2">
                          {{ renderWalltime(limit.value) }}
                        </dd>
                      </div>
                    </dl>
                  </td>
                  <td
                    class="hidden px-3 py-4 align-top text-sm text-gray-300 2xl:table-cell dark:text-gray-400"
                  >
                    {{ renderQosLabel(association.qos) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
