<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import type { Ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import { useGatewayAPI, type ClusterDescription } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'
import { useErrorsHandler } from '@/composables/ErrorsHandler'
import ClusterListItem from '@/components/clusters/ClustersListItem.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'
import { ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'

const runtimeStore = useRuntimeStore()
const runtimeConfiguration = useRuntimeConfiguration()
const gateway = useGatewayAPI()
const { reportAuthenticationError, reportServerError } = useErrorsHandler()
const clusters: Ref<Array<ClusterDescription>> = ref([])
const loaded: Ref<boolean> = ref(false)
const unable: Ref<boolean> = ref(false)
const router = useRouter()
const awaitingAutoRedirect = ref<boolean>(false)
const awaitingClusterName = ref<string | null>(null)
/* Check if there is at least one cluster with error. This is useful when there
 * is only one cluster with permissions but this cluster is not available. In
 * this case, we want to display the list of clusters with the error to the
 * user. */
const clusterWithError = computed(() => {
  return clusters.value.find((cluster) => cluster.error)
})

async function getClustersDescriptions() {
  try {
    clusters.value = await gateway.clusters()
    runtimeStore.availableClusters = []
    clusters.value.forEach((element) => {
      /* Consider this cluster does not have error at this stage. It could be
       * set to true if stats retrieval fail later on.
       */
      element.error = false
      runtimeStore.addCluster(element)
    })
    loaded.value = true

    /* Get list of clusters with permissions. If there is only one, set some
     * refs to make handleClusterPing() redirect automatically to the
     * dashboard of this cluster. */
    const clustersWithPermissions = clusters.value.filter(
      (cluster) => cluster.permissions.actions.length > 0
    )
    if (clustersWithPermissions.length === 1) {
      awaitingAutoRedirect.value = true
      awaitingClusterName.value = clustersWithPermissions[0].name
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      reportAuthenticationError(error)
    } else if (error instanceof Error) {
      reportServerError(error)
      unable.value = true
    }
  }
}

/* Handle cluster ping response. If there is only one cluster with permissions,
 * redirect to the dashboard of this cluster if the ping response is successful. */
function handleClusterPing(cluster: ClusterDescription) {
  /* If we are not awaiting auto redirect or the cluster name is not the one
   * we are awaiting, return. */
  if (!awaitingAutoRedirect.value || awaitingClusterName.value !== cluster.name) {
    return
  }

  /* If the cluster has an error, set loaded to true to remove the loading spinner
   * and skip the redirect. */
  if (cluster.error) {
    loaded.value = true
    return
  }

  /* Redirect to the dashboard of the cluster. */
  router.push({ name: 'dashboard', params: { cluster: cluster.name } })
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
        class="absolute right-0 m-2 flex p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 hover:dark:text-gray-200"
      >
        Signout
        <ArrowRightOnRectangleIcon class="h-6 w-6" />
      </button>
    </RouterLink>
    <section
      class="bg-slurmweb-light flex h-screen items-center justify-center gap-y-6 dark:bg-gray-900"
    >
      <div v-if="unable" class="w-full rounded-md bg-red-50 p-4 lg:w-[60%]">
        <div class="flex">
          <div class="shrink-0">
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
        class="flex h-24 w-full animate-pulse items-center justify-center rounded-xl bg-slate-200 text-sm text-gray-600 lg:w-[60%] dark:text-gray-400"
      >
        <LoadingSpinner :size="5" />
        Loading clusters…
      </div>
      <div v-else-if="!clusters.length" class="w-full rounded-md bg-blue-50 p-4 lg:w-[60%]">
        <div class="flex">
          <div class="shrink-0">
            <XCircleIcon class="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">Empty cluster list</h3>
            <p class="mt-2 text-sm text-blue-700">Try to refresh…</p>
          </div>
        </div>
      </div>
      <div
        v-else
        v-show="!awaitingAutoRedirect || clusterWithError"
        class="flex w-full flex-col lg:w-[80%] xl:w-[60%]"
      >
        <h1 class="flex px-4 text-left text-lg font-medium text-gray-700 dark:text-gray-400">
          Select a cluster
        </h1>
        <ul
          role="list"
          class="divide-y divide-gray-100 overflow-hidden bg-white shadow-xs ring-1 ring-gray-100 lg:rounded-xl dark:divide-gray-700 dark:bg-gray-800 dark:ring-gray-700"
        >
          <ClusterListItem
            v-for="cluster in clusters"
            :key="cluster.name"
            :cluster-name="cluster.name"
            @pinged="handleClusterPing"
          />
        </ul>
      </div>
    </section>
  </main>
</template>
