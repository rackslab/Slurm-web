<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterAssociation } from '@/composables/GatewayAPI'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const { cluster } = defineProps<{ cluster: string }>()

const { data, unable, setCluster } = useClusterDataPoller<ClusterAssociation[]>(
  cluster,
  'associations',
  120000
)
</script>

<template>
  <ClusterMainLayout menu-entry="accounts" :cluster="cluster" :breadcrumb="[{ title: 'Accounts' }]">
    <div class="mx-auto flex items-center justify-between">
      <div class="px-4 py-16 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Accounts</h1>
        <p class="mt-4 max-w-xl text-sm font-light text-gray-600 dark:text-gray-300">
          Associations defined on cluster
        </p>
      </div>
    </div>
    <ErrorAlert v-if="unable"
      >Unable to retrieve associations from cluster
      <span class="font-medium">{{ cluster }}</span></ErrorAlert
    >
    <InfoAlert v-else-if="data?.length == 0"
      >No association defined on cluster <span class="font-medium">{{ cluster }}</span></InfoAlert
    >
    <div v-else class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle">
          <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-500">
            <thead>
              <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                <th
                  scope="col"
                  class="py-3.5 pr-3 text-left align-top sm:pl-6 lg:min-w-[250px] lg:pl-8"
                >
                  Name
                </th>
                <th scope="col" class="w-24 px-3 py-3.5 text-left align-top">Priority</th>
                <th scope="col" class="hidden w-72 px-3 py-3.5 text-left lg:table-cell">Jobs</th>
                <th scope="col" class="hidden w-72 px-3 py-3.5 text-left lg:table-cell">
                  Resources
                </th>
                <th scope="col" class="w-12 px-3 py-3.5 text-left">Time</th>
                <th scope="col" class="hidden w-12 px-3 py-3.5 text-left align-top 2xl:table-cell">
                  Flags
                </th>
                <th scope="col" class="w-12"></th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-gray-200 text-sm text-gray-600 dark:divide-gray-700 dark:text-gray-300"
            >
              <tr v-for="association in data" :key="association.account">
                <td
                  class="py-4 pr-3 whitespace-nowrap text-gray-900 sm:pl-6 lg:pl-8 dark:text-gray-100"
                >
                  <p class="text-base font-medium">{{ association.account }}</p>
                  <p class="text-gray-500">{{ association.parent_account }}</p>
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  {{ association.max }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
