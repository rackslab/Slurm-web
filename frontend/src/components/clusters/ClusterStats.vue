<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'
import { useErrorsHandler } from '@/composables/ErrorsHandler'
import { ServerIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import { useRuntimeStore } from '@/stores/runtime'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
const { clusterName } = defineProps<{ clusterName: string }>()

const runtimeStore = useRuntimeStore()
const cluster = runtimeStore.getCluster(clusterName)
const loading = ref<boolean>(true)
const { reportAuthenticationError, reportServerError } = useErrorsHandler()

const gateway = useGatewayAPI()

async function getClusterStats() {
  try {
    cluster.stats = await gateway.stats(clusterName)
  } catch (err) {
    if (err instanceof AuthenticationError) {
      reportAuthenticationError(err)
    } else if (err instanceof Error) {
      reportServerError(err)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getClusterStats()
})
</script>

<template>
  <LoadingSpinner v-if="loading" class="animate-pulse text-gray-400" :size="5" />
  <span v-else-if="cluster.stats" class="hidden text-center md:flex">
    <span class="mt-1 w-20 text-xs leading-5 text-gray-500">
      <ServerIcon class="h-6 w-full" />
      <p class="w-full">
        {{ cluster.stats.resources.nodes }} node{{ cluster.stats.resources.nodes > 1 ? 's' : '' }}
      </p>
    </span>
    <span class="mt-1 w-20 text-xs leading-5 text-gray-500">
      <PlayCircleIcon class="h-6 w-full" />
      <p class="w-full">
        {{ cluster.stats.jobs.running }} job{{ cluster.stats.jobs.running > 1 ? 's' : '' }}
      </p>
    </span>
  </span>
</template>
