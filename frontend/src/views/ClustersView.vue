<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import { useGatewayAPI, type ClusterDescription } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ChevronRightIcon, XCircleIcon } from '@heroicons/vue/20/solid'
import { TagIcon } from '@heroicons/vue/20/solid'
import { ServerIcon, PlayCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'

const runtimeStore = useRuntimeStore()
const runtimeConfiguration = useRuntimeConfiguration()
const gateway = useGatewayAPI()
const router = useRouter()
const clusters: Ref<Array<ClusterDescription>> = ref([])
const loaded: Ref<Boolean> = ref(false)
const unable: Ref<Boolean> = ref(false)
const clustersErrors = ref<Record<string, boolean>>({})

function reportAuthenticationError(error: AuthenticationError) {
  runtimeStore.reportError(`Authentication error: ${error.message}`)
  router.push({ name: 'signout' })
}

function reportOtherError(error: Error) {
  runtimeStore.reportError(`Server error: ${error.message}`)
}

async function getClustersDescriptions() {
  try {
    clusters.value = await gateway.clusters()
    runtimeStore.availableClusters = []
    clusters.value.forEach((element) => {
      if (element.permissions.actions.length > 0) {
        runtimeStore.addCluster(element)
      }
      clustersErrors.value[element.name] = false
    })
    loaded.value = true
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      reportAuthenticationError(error)
    } else {
      reportOtherError(error)
      unable.value = true
    }
  }
}

function getClustersStats() {
  runtimeStore.availableClusters.forEach((cluster) => {
    gateway
      .stats(cluster.name)
      .then((result) => {
        cluster.stats = result
      })
      .catch((error: any) => {
        if (error instanceof AuthenticationError) {
          reportAuthenticationError(error)
        } else {
          reportOtherError(error)
          clustersErrors.value[cluster.name] = true
        }
      })
  })
}

onMounted(async () => {
  await getClustersDescriptions()
  getClustersStats()
})
</script>

<template>
  <main>
    <RouterLink
      v-if="runtimeConfiguration.authentication"
      :to="{ name: 'signout' }"
      custom
      v-slot="{ navigate }"
    >
      <button
        @click="navigate"
        role="link"
        class="absolute right-0 m-2 flex p-2 text-gray-600 hover:text-gray-800"
      >
        Signout
        <ArrowRightOnRectangleIcon class="h-6 w-6" />
      </button>
    </RouterLink>
    <section
      class="flex h-screen items-center justify-center gap-y-6 bg-slurmweb-light dark:bg-gray-900"
    >
      <div v-if="unable" class="w-full rounded-md bg-red-50 p-4 lg:w-[60%]">
        <div class="flex">
          <div class="flex-shrink-0">
            <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Unable to load cluster list</h3>
            <p class="mt-2 text-sm text-red-700">Try to refresh…</p>
          </div>
        </div>
      </div>
      <div
        v-else-if="!loaded"
        class="flex h-24 w-full animate-pulse items-center justify-center rounded-xl bg-slate-200 text-sm text-gray-600 lg:w-[60%]"
      >
        <LoadingSpinner :size="5" />
        Loading clusters…
      </div>
      <div v-else-if="!clusters.length" class="w-full rounded-md bg-blue-50 p-4 lg:w-[60%]">
        <div class="flex">
          <div class="flex-shrink-0">
            <XCircleIcon class="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">Empty cluster list</h3>
            <p class="mt-2 text-sm text-blue-700">Try to refresh…</p>
          </div>
        </div>
      </div>
      <div v-else class="flex w-full flex-col lg:w-[80%] xl:w-[60%]">
        <h1 class="flex px-4 text-left text-lg font-medium text-gray-700">Select a cluster</h1>
        <ul
          role="list"
          class="divide-y divide-gray-100 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 lg:rounded-xl"
        >
          <li
            v-for="cluster in clusters"
            :key="cluster.name"
            :class="[
              cluster.permissions.actions.length > 0
                ? 'cursor-pointer hover:bg-gray-50'
                : 'cursor-not-allowed bg-gray-100',
              'relative flex h-20 items-center justify-between px-4 py-5  sm:px-6'
            ]"
            @click="
              cluster.permissions.actions.length > 0 &&
                router.push({ name: 'dashboard', params: { cluster: cluster.name } })
            "
          >
            <span class="w-64 text-sm font-semibold leading-6 text-gray-900">
              <RouterLink :to="{ name: 'dashboard', params: { cluster: cluster.name } }">
                <span class="inset-x-0 -top-px bottom-0" />
                {{ cluster.name }}
              </RouterLink>
              <span
                v-if="cluster.stats"
                class="ml-2 hidden items-center gap-x-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600 md:inline-flex"
              >
                <TagIcon class="h-3" />
                Slurm {{ cluster.stats.version }}
              </span>
            </span>
            <span v-if="cluster.stats" class="hidden text-center md:flex">
              <span class="mt-1 w-20 text-xs leading-5 text-gray-500">
                <ServerIcon class="h-6 w-full" />
                <p class="w-full">
                  {{ cluster.stats.resources.nodes }} node{{
                    cluster.stats.resources.nodes > 1 ? 's' : ''
                  }}
                </p>
              </span>
              <span class="mt-1 w-20 text-xs leading-5 text-gray-500">
                <PlayCircleIcon class="h-6 w-full" />
                <p class="w-full">
                  {{ cluster.stats.jobs.running }} job{{
                    cluster.stats.jobs.running > 1 ? 's' : ''
                  }}
                </p>
              </span>
            </span>
            <div class="mr-0 w-64 shrink-0 items-end gap-x-4">
              <div class="hidden sm:flex sm:flex-col sm:items-end">
                <div
                  v-if="cluster.permissions.actions.length == 0"
                  class="mt-1 flex items-center gap-x-1.5"
                >
                  <div class="flex-none rounded-full bg-red-500/20 p-1">
                    <div class="h-1.5 w-1.5 rounded-full bg-red-500" />
                  </div>
                  <p class="text-xs leading-5 text-gray-500">Denied</p>
                </div>
                <div
                  v-else-if="cluster.name in clustersErrors && clustersErrors[cluster.name]"
                  class="mt-1 flex items-center gap-x-1.5"
                >
                  <div class="flex-none rounded-full bg-orange-500/20 p-1">
                    <div class="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </div>
                  <p class="text-xs leading-5 text-gray-500">Ongoing issue</p>
                  <ChevronRightIcon class="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
                </div>
                <div
                  v-else-if="!cluster.stats"
                  class="mt-1 flex items-center gap-x-1.5"
                >
                  <div class="flex-none rounded-full bg-gray-500/20 p-1">
                    <div class="h-1.5 w-1.5 rounded-full bg-gray-500" />
                  </div>
                  <p class="text-xs leading-5 text-gray-500">Loading</p>
                  <ChevronRightIcon class="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
                </div>
                <div v-else class="mt-1 flex items-center gap-x-1.5">
                  <div class="flex-none rounded-full bg-emerald-500/20 p-1">
                    <div class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <p class="text-xs leading-5 text-gray-500">Available</p>
                  <ChevronRightIcon class="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>
