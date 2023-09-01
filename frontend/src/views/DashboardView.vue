<script setup lang="ts">
import { ClusterStats } from '@/composables/GatewayAPI'
import { useClusterDataPoller } from '@/composables/DataPoller'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const { data, unable } = useClusterDataPoller<ClusterStats>('stats', 10000, props)
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="Dashboard">
    <div class="mx-auto max-w-7xl bg-white">
      <div v-if="unable">Unable to display data from cluster {{ props.cluster }}</div>
      <div v-else class="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Nodes</p>
          <span v-if="data" class="text-4xl font-semibold tracking-tight text-gray-600">
            {{ data.resources.nodes }}
          </span>
          <div v-else class="animate-pulse flex space-x-4">
            <div class="rounded-full bg-slate-200 h-10 w-10"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Cores</p>
          <span v-if="data" class="text-4xl font-semibold tracking-tight text-gray-600">
            {{ data.resources.cores }}
          </span>
          <div v-else class="animate-pulse flex space-x-4">
            <div class="rounded-full bg-slate-200 h-10 w-10"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Running jobs</p>
          <span v-if="data" class="text-4xl font-semibold tracking-tight text-gray-600">
            {{ data.jobs.running }}
          </span>
          <div v-else class="animate-pulse flex space-x-4">
            <div class="rounded-full bg-slate-200 h-10 w-10"></div>
          </div>
        </div>
        <div class="bg-white px-4 py-6 sm:px-6 lg:px-8">
          <p class="text-sm font-medium leading-6 text-gray-400">Total jobs</p>
          <span v-if="data" class="text-4xl font-semibold tracking-tight text-gray-600">
            {{ data.jobs.total }}
          </span>
          <div v-else class="animate-pulse flex space-x-4">
            <div class="rounded-full bg-slate-100 h-10 w-10"></div>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>