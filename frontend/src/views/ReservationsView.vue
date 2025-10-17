<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { watch } from 'vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterReservation } from '@/composables/GatewayAPI'
import { representDuration } from '@/composables/TimeDuration'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const { cluster } = defineProps<{ cluster: string }>()

const {
  data,
  unable,
  loaded: _loaded,
  setCluster
} = useClusterDataPoller<ClusterReservation[]>(cluster, 'reservations', 10000)

watch(
  () => cluster,
  (new_cluster) => {
    setCluster(new_cluster)
  }
)
</script>

<template>
  <ClusterMainLayout
    menu-entry="reservations"
    :cluster="cluster"
    :breadcrumb="[{ title: 'Reservations' }]"
  >
    <div class="mx-auto flex items-center justify-between">
      <div class="px-4 py-16 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Reservations
        </h1>
        <p class="mt-4 max-w-xl text-sm font-light text-gray-600 dark:text-gray-300">
          Advanced reservations defined on cluster
        </p>
      </div>
    </div>
    <ErrorAlert v-if="unable"
      >Unable to retrieve reservations from cluster
      <span class="font-medium">{{ cluster }}</span></ErrorAlert
    >
    <InfoAlert v-else-if="data?.length == 0"
      >No reservation defined on cluster <span class="font-medium">{{ cluster }}</span></InfoAlert
    >
    <div v-else class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle">
          <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-500">
            <thead>
              <tr class="text-sm font-semibold text-gray-900 dark:text-gray-200">
                <th
                  scope="col"
                  class="w-48 py-3.5 pr-3 text-left align-top sm:pl-6 lg:min-w-[150px] lg:pl-8"
                >
                  Name
                </th>
                <th scope="col" class="w-72 px-3 py-3.5 text-left align-top">Nodes</th>
                <th scope="col" class="w-72 px-3 py-3.5 text-left">Duration</th>
                <th scope="col" class="w-12 px-3 py-3.5 text-left">Users</th>
                <th scope="col" class="w-12 px-3 py-3.5 text-left">Accounts</th>
                <th scope="col" class="hidden w-24 px-3 py-3.5 text-left align-top 2xl:table-cell">
                  Flags
                </th>
                <th scope="col" class="w-12"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 text-gray-900 dark:text-gray-100">
              <tr v-for="reservation in data" :key="reservation.name">
                <td class="pr-3 sm:pl-6 lg:pl-8">{{ reservation.name }}</td>
                <td class="hidden px-3 text-sm break-all 2xl:table-cell">
                  <p class="font-mono text-xs">{{ reservation.node_list }}</p>
                  <p class="text-gray-500">→ {{ reservation.node_count }} nodes</p>
                </td>
                <td class="table-cell px-3 text-sm 2xl:hidden">{{ reservation.node_count }}</td>
                <td class="px-3 text-sm whitespace-nowrap">
                  <p class="hidden xl:block">
                    <template v-if="reservation.start_time.set">
                      {{ new Date(reservation.start_time.number * 10 ** 3).toLocaleString() }}
                    </template>
                    <template v-else>-</template>
                  </p>
                  <p v-if="reservation.end_time.set" class="hidden xl:block">
                    <span class="font-bold">→</span>
                    {{ new Date(reservation.end_time.number * 10 ** 3).toLocaleString() }}
                  </p>
                  <p class="xl:text-gray-500 xl:italic">
                    {{ representDuration(reservation.start_time, reservation.end_time) }}
                  </p>
                </td>
                <td class="px-3 text-sm">
                  <XMarkIcon
                    v-if="!reservation.users"
                    class="mr-0.5 h-5 w-5 text-gray-400 dark:text-gray-600"
                    aria-hidden="true"
                  />
                  <ul v-else class="list-disc">
                    <li v-for="user in reservation.users.split(',')" :key="user">{{ user }}</li>
                  </ul>
                </td>
                <td class="px-3 text-sm">
                  <XMarkIcon
                    v-if="!reservation.accounts"
                    class="mr-0.5 h-5 w-5 text-gray-400 dark:text-gray-600"
                    aria-hidden="true"
                  />
                  <ul v-else class="list-disc">
                    <li v-for="account in reservation.accounts.split(',')" :key="account">
                      {{ account }}
                    </li>
                  </ul>
                </td>
                <td class="hidden pl-3 text-sm sm:pr-6 lg:pr-8 2xl:table-cell">
                  <span
                    v-for="flag in reservation.flags"
                    :key="flag"
                    class="bg-slurmweb-light/50 dark:bg-slurmweb-verydark text-slurmweb-dark dark:text-slurmweb-light ring-slurmweb-dark/10 m-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                    >{{ flag }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
