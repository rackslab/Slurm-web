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
import ClusterListItem from '@/components/clusters/ClustersListItem.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'
import { ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'

const runtimeStore = useRuntimeStore()
const runtimeConfiguration = useRuntimeConfiguration()
const gateway = useGatewayAPI()
const router = useRouter()
const clusters: Ref<Array<ClusterDescription>> = ref([])
const loaded: Ref<boolean> = ref(false)
const unable: Ref<boolean> = ref(false)

function reportAuthenticationError(error: AuthenticationError) {
  runtimeStore.reportError(`Authentication error: ${error.message}`)
  router.push({ name: 'signout' })
}

function reportOtherError(error: Error) {
  runtimeStore.reportError(`Server error: ${error.message}`)
  unable.value = true
}

async function getClustersDescriptions() {
  try {
    clusters.value = await gateway.clusters()
    runtimeStore.availableClusters = []
    clusters.value.forEach((element) => {
      /* Consider this cluster does not have error at this stage. It could be
       * set to true if stats retrieval fail later on.
       */
      element.error = false
      if (element.permissions.actions.length > 0) {
        runtimeStore.addCluster(element)
      }
    })
    loaded.value = true
  } catch (error) {
    if (error instanceof AuthenticationError) {
      reportAuthenticationError(error)
    } else if (error instanceof Error) {
      reportOtherError(error)
    }
  }
}

onMounted(() => {
  getClustersDescriptions()
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
          <ClusterListItem
            v-for="cluster in clusters"
            :key="cluster.name"
            :cluster-name="cluster.name"
          />
        </ul>
      </div>
    </section>
  </main>
</template>
