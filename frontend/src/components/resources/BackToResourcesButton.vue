<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'

const { cluster } = defineProps<{ cluster: string }>()

const router = useRouter()
const route = useRoute()

const returnRoute = computed(() => {
  const validRoutes = ['resources', 'resources-diagram-nodes', 'resources-diagram-cores']
  const queryRoute = route.query.returnTo as string
  return validRoutes.includes(queryRoute) ? queryRoute : 'resources'
})

function handleBackClick() {
  router.push({ name: returnRoute.value, params: { cluster } })
}
</script>

<template>
  <button
    @click="handleBackClick"
    type="button"
    class="bg-slurmweb dark:bg-slurmweb-verydark hover:bg-slurmweb-dark focus-visible:outline-slurmweb-dark mt-8 mb-16 inline-flex items-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
  >
    <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
    Back to resources
  </button>
</template>
