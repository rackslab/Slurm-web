<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'

const runtimeStore = useRuntimeStore()
const router = useRouter()

function leaveSettings() {
  if (runtimeStore.beforeSettingsRoute) {
    const from = runtimeStore.beforeSettingsRoute
    runtimeStore.beforeSettingsRoute = undefined
    router.push(from)
  } else {
    if (runtimeStore.currentCluster) {
      router.push({ name: 'dashboard', params: { cluster: runtimeStore.currentCluster.name } })
    } else {
      router.push({ name: 'clusters' })
    }
  }
}
</script>

<template>
  <button
    @click="leaveSettings()"
    type="button"
    class="bg-slurmweb dark:bg-slurmweb-verydark hover:bg-slurmweb-dark focus-visible:outline-slurmweb-dark mt-8 mb-16 inline-flex items-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
  >
    <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
    Back to dashboards
  </button>
</template>
