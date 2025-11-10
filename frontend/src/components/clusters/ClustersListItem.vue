<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'
import { useErrorsHandler } from '@/composables/ErrorsHandler'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'
import { TagIcon } from '@heroicons/vue/20/solid'
import ClusterStats from '@/components/clusters/ClusterStats.vue'

const { clusterName } = defineProps<{ clusterName: string }>()

const runtimeStore = useRuntimeStore()
const cluster = runtimeStore.getCluster(clusterName)
const loading = ref<boolean>(true)
const { reportAuthenticationError, reportServerError } = useErrorsHandler()

const gateway = useGatewayAPI()
const router = useRouter()

async function getClustersPing() {
  if (cluster.permissions.actions.length == 0) {
    loading.value = false
    return
  }
  try {
    const response = await gateway.ping(cluster.name)
    cluster.version = response.version
  } catch (error) {
    if (error instanceof AuthenticationError) {
      reportAuthenticationError(error)
    } else if (error instanceof Error) {
      reportServerError(error)
      cluster.error = true
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getClustersPing()
})
</script>
<template>
  <li
    :class="[
      cluster.permissions.actions.length > 0
        ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
        : 'cursor-not-allowed bg-gray-100 dark:bg-gray-900',
      'relative flex h-20 items-center justify-between px-4 py-5 sm:px-6'
    ]"
    @click="
      cluster.permissions.actions.length > 0 &&
        router.push({ name: 'dashboard', params: { cluster: cluster.name } })
    "
  >
    <span class="w-64 text-sm leading-6 font-semibold text-gray-900 dark:text-gray-300">
      <RouterLink :to="{ name: 'dashboard', params: { cluster: cluster.name } }">
        <span class="inset-x-0 -top-px bottom-0" />
        {{ cluster.name }}
      </RouterLink>
      <span
        v-if="cluster.version"
        class="dark:bg-slurmweb-dark ml-2 hidden items-center gap-x-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600 md:inline-flex dark:text-gray-300"
      >
        <TagIcon class="h-3" />
        Slurm {{ cluster.version }}
      </span>
    </span>
    <ClusterStats
      v-if="
        runtimeStore.hasClusterPermission(cluster.name, 'view-stats') && !loading && !cluster.error
      "
      :cluster-name="cluster.name"
    />
    <div class="mr-0 w-64 shrink-0 items-end gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <div v-if="loading" class="mt-1 flex items-center gap-x-1.5">
          <div class="flex-none rounded-full bg-gray-500/20 p-1">
            <div class="h-1.5 w-1.5 rounded-full bg-gray-500" />
          </div>
          <p class="text-xs leading-5 text-gray-500 dark:text-gray-300">Loading</p>
          <ChevronRightIcon class="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
        </div>
        <div
          v-else-if="cluster.permissions.actions.length == 0"
          class="mt-1 flex items-center gap-x-1.5"
        >
          <div class="flex-none rounded-full bg-red-500/20 p-1">
            <div class="h-1.5 w-1.5 rounded-full bg-red-500" />
          </div>
          <p class="text-xs leading-5 text-gray-500 dark:text-gray-300">Denied</p>
        </div>
        <div v-else-if="cluster.error" class="mt-1 flex items-center gap-x-1.5">
          <div class="flex-none rounded-full bg-orange-500/20 p-1">
            <div class="h-1.5 w-1.5 rounded-full bg-orange-500" />
          </div>
          <p class="text-xs leading-5 text-gray-500 dark:text-gray-300">Ongoing issue</p>
          <ChevronRightIcon class="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
        </div>
        <div v-else class="mt-1 flex items-center gap-x-1.5">
          <div class="flex-none rounded-full bg-emerald-500/20 p-1">
            <div class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <p class="text-xs leading-5 text-gray-500 dark:text-gray-300">Available</p>
          <ChevronRightIcon class="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
        </div>
      </div>
    </div>
  </li>
</template>
