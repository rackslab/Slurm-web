<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterReservation } from '@/composables/GatewayAPI'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const { data, unable } = useClusterDataPoller<ClusterReservation[]>('reservations', 10000)

function representDuration(start: number, end: number): string {
  let duration = end - start

  let result = ''
  if (duration > 3600 * 24) {
    const nb_days = Math.floor(duration / (3600 * 24))
    result += nb_days + ' day' + (nb_days > 1 ? 's' : '') + ' '
    duration -= nb_days * 3600 * 24
  }
  if (duration > 3600) {
    const nb_hours = Math.floor(duration / 3600)
    result += nb_hours + ' hour' + (nb_hours > 1 ? 's' : '') + ' '
    duration -= nb_hours * 3600
  }
  if (duration > 60) {
    const nb_minutes = Math.floor(duration / 60)
    result += nb_minutes + ' minute' + (nb_minutes > 1 ? 's' : '') + ' '
    duration -= nb_minutes * 60
  }
  if (duration > 0) {
    result += duration + ' second' + (duration > 1 ? 's' : '')
  }
  return result
}
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="Reservations">
    <div class="mx-auto flex items-center justify-between">
      <div class="px-4 py-16 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">Reservations</h1>
        <p class="mt-4 max-w-xl text-sm font-light text-gray-600">
          Advanced reservations defined on cluster
        </p>
      </div>
    </div>
    <ErrorAlert v-if="unable"
      >Unable to retrieve reservations from cluster
      <span class="font-medium">{{ props.cluster }}</span></ErrorAlert
    >
    <InfoAlert v-else-if="data?.length == 0"
      >No reservation defined on cluster
      <span class="font-medium">{{ props.cluster }}</span></InfoAlert
    >
    <div v-else class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="w-48 py-3.5 pr-3 text-left align-top text-sm font-semibold text-gray-900 sm:pl-6 lg:min-w-[150px] lg:pl-8"
                >
                  Name
                </th>
                <th
                  scope="col"
                  class="w-72 px-3 py-3.5 text-left align-top text-sm font-semibold text-gray-900"
                >
                  Nodes
                </th>
                <th
                  scope="col"
                  class="w-72 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  class="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Users
                </th>
                <th
                  scope="col"
                  class="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Accounts
                </th>
                <th
                  scope="col"
                  class="hidden w-24 px-3 py-3.5 text-left align-top text-sm font-semibold text-gray-900 2xl:table-cell"
                >
                  Flags
                </th>
                <th scope="col" class="w-12"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="reservation in data" :key="reservation.name">
                <td class="pr-3 sm:pl-6 lg:pl-8">{{ reservation.name }}</td>
                <td class="hidden break-all px-3 text-sm 2xl:table-cell">
                  <p class="font-mono text-xs">{{ reservation.node_list }}</p>
                  <p class="text-gray-500">→ {{ reservation.node_count }} nodes</p>
                </td>
                <td class="table-cell px-3 text-sm 2xl:hidden">{{ reservation.node_count }}</td>
                <td class="whitespace-nowrap px-3 text-sm">
                  <p class="hidden xl:block">
                    {{ new Date(reservation.start_time * 10 ** 3).toLocaleString() }}
                  </p>
                  <p class="hidden xl:block">
                    <span class="font-bold">→</span>
                    {{ new Date(reservation.end_time * 10 ** 3).toLocaleString() }}
                  </p>
                  <p class="xl:italic xl:text-gray-500">
                    {{ representDuration(reservation.start_time, reservation.end_time) }}
                  </p>
                </td>
                <td class="px-3 text-sm">
                  <ul class="list-disc">
                    <li v-for="user in reservation.users.split(',')" :key="user">{{ user }}</li>
                  </ul>
                </td>
                <td class="px-3 text-sm">
                  <ul class="list-disc">
                    <li v-for="account in reservation.accounts.split(',')" :key="account">
                      {{ account }}
                    </li>
                  </ul>
                </td>
                <td class="hidden pl-3 text-sm sm:pr-6 lg:pr-8 2xl:table-cell">
                  <span
                    v-for="flag in reservation.flags"
                    :key="flag"
                    class="m-1 inline-flex items-center rounded-md bg-slurmweb-light/50 px-2 py-1 text-xs font-medium text-slurmweb-dark ring-1 ring-inset ring-slurmweb-dark/10"
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
