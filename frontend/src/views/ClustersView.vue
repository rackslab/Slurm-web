<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useGatewayAPI, type ClusterDescription } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'
import { ChevronRightIcon, XCircleIcon } from '@heroicons/vue/20/solid'
import { CpuChipIcon, PlayCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'

const runtimeStore = useRuntimeStore()
const gateway = useGatewayAPI()
const router = useRouter()
const clusters: Ref<Array<ClusterDescription>> = ref([])
const loaded: Ref<Boolean> = ref(false)
const unable: Ref<Boolean> = ref(false)

function reportAuthenticationError(error: AuthenticationError) {
  runtimeStore.reportError(`Authentication error: ${error.message}`)
  router.push({ name: 'login' })
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
      if (element.permissions.actions.length > 0) {
        runtimeStore.addCluster(element)
      }
    })
    loaded.value = true
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      reportAuthenticationError(error)
    } else {
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
    <RouterLink :to="{ name: 'signout' }" custom v-slot="{ navigate }">
      <button
        @click="navigate"
        role="link"
        class="flex m-2 p-2 text-gray-600 hover:text-gray-800 absolute right-0"
      >
        Signout
        <ArrowRightOnRectangleIcon class="h-6 w-6" />
      </button>
    </RouterLink>
    <section
      class="flex h-screen justify-center items-center gap-y-6 bg-slurmweb-light dark:bg-gray-900"
    >
      <div v-if="unable" class="lg:w-[60%] w-full rounded-md bg-red-50 p-4">
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
      <div v-else-if="loaded" class="lg:w-[60%] w-full flex flex-col">
        <h1 class="flex px-4 text-left font-medium text-gray-700 text-lg">Select a cluster</h1>
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
              'relative flex justify-between items-center px-4 py-5 h-20  sm:px-6'
            ]"
            @click="
              cluster.permissions.actions.length > 0 &&
                router.push({ name: 'dashboard', params: { cluster: cluster.name } })
            "
          >
            <span class="w-16 text-sm font-semibold leading-6 text-gray-900">
              <RouterLink :to="{ name: 'dashboard', params: { cluster: cluster.name } }">
                <span class="inset-x-0 -top-px bottom-0" />
                {{ cluster.name }}
              </RouterLink>
            </span>
            <span v-if="cluster.stats" class="hidden md:flex text-center">
              <span class="mt-1 w-20 text-xs leading-5 text-gray-500">
                <CpuChipIcon class="h-6 w-full" />
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
            <div class="flex shrink-0 items-center gap-x-4">
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
                <div v-else-if="!('stats' in cluster)" class="mt-1 flex items-center gap-x-1.5">
                  <div class="flex-none rounded-full bg-orange-500/20 p-1">
                    <div class="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </div>
                  <p class="text-xs leading-5 text-gray-500">Ongoing issue</p>
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
      <div
        v-else
        class="flex items-center justify-center lg:w-[60%] w-full animate-pulse rounded-xl text-gray-600 text-sm bg-slate-200 h-24"
      >
        Loading clusters…
      </div>
    </section>
  </main>
</template>
