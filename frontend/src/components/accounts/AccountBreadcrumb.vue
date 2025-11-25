<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'
import type { ClusterAssociation } from '@/composables/GatewayAPI'

const { cluster, account, associations, showCurrent } = defineProps<{
  cluster: string
  account: string
  associations: ClusterAssociation[]
  showCurrent?: boolean
}>()

const breadcrumb = computed(() => {
  const accountAssociation = associations.find(
    (association) => association.account === account && !association.user
  )
  if (!accountAssociation) {
    return []
  }

  const parents: string[] = []
  let currentAccount = accountAssociation.parent_account
  const accountMap = new Map<string, ClusterAssociation>()

  for (const association of associations) {
    if (!association.user) {
      accountMap.set(association.account, association)
    }
  }

  while (currentAccount && accountMap.has(currentAccount)) {
    parents.unshift(currentAccount)
    currentAccount = accountMap.get(currentAccount)!.parent_account
  }

  const items = parents.map((name) => ({ name }))
  if (showCurrent) {
    items.push({ name: account })
  }

  return items
})
</script>

<template>
  <div v-if="breadcrumb.length === 0" class="text-gray-400 dark:text-gray-500">∅</div>
  <div v-else class="flex items-center gap-2">
    <template v-for="(entry, index) in breadcrumb" :key="`${entry.name}-${index}`">
      <RouterLink
        :to="{ name: 'account', params: { cluster, account: entry.name } }"
        class="text-slurmweb hover:text-slurmweb-dark dark:text-slurmweb-light font-semibold"
      >
        {{ entry.name }}
      </RouterLink>

      <span v-if="index < breadcrumb.length - 1" class="text-gray-400">
        <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
      </span>
    </template>
  </div>
</template>
