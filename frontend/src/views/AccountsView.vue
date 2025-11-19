<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterAssociation, ClusterAccountTreeNode } from '@/composables/GatewayAPI'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import AccountTreeNode from '@/components/accounts/AccountTreeNode.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { cluster } = defineProps<{ cluster: string }>()

const { data, unable, loaded } = useClusterDataPoller<ClusterAssociation[]>(
  cluster,
  'associations',
  120000
)

/* Set of accounts that are currently expanded in the tree */
const expandedAccounts = ref<Set<string>>(new Set())
/* Flag to indicate if the tree has been auto expanded once */
const autoExpandedOnce = ref(false)
/* Maximum number of accounts to auto expand in the tree */
const MAX_AUTO_EXPANDED = 10

/* Toggle the expansion of an account in the tree, triggered by the emitted
 * event from the AccountTreeNode component. */
function toggleAccount(account: string) {
  if (expandedAccounts.value.has(account)) {
    expandedAccounts.value.delete(account)
  } else {
    expandedAccounts.value.add(account)
  }
}

/* Compute the tree of accounts from the cluster associations. */
const accountTree = computed<ClusterAccountTreeNode[]>(() => {
  if (!data.value || data.value.length === 0) {
    return []
  }

  // Create a map of all accounts
  const accountMap = new Map<string, ClusterAccountTreeNode>()
  const rootAccounts: ClusterAccountTreeNode[] = []

  // First pass: create all nodes without duplicating accounts
  for (const association of data.value) {
    const existingNode = accountMap.get(association.account)
    if (existingNode) {
      // Enrich existing node with users info
      if (association.user) {
        existingNode.users.push(association.user)
      }
      continue
    }
    const node: ClusterAccountTreeNode = {
      children: [],
      level: 0,
      account: association.account,
      max: association.max,
      parent_account: association.parent_account,
      qos: association.qos,
      users: association.user ? [association.user] : []
    }
    accountMap.set(association.account, node)
  }

  // Second pass: build the tree
  for (const node of accountMap.values()) {
    if (node.parent_account && accountMap.has(node.parent_account)) {
      const parent = accountMap.get(node.parent_account)!
      parent.children.push(node)
      node.level = parent.level + 1
    } else {
      rootAccounts.push(node)
    }
  }

  // Sort children alphabetically
  function sortTree(nodes: ClusterAccountTreeNode[]) {
    nodes.sort((a, b) => a.account.localeCompare(b.account))
    for (const node of nodes) {
      sortTree(node.children)
    }
  }

  sortTree(rootAccounts)
  return rootAccounts
})

/* Set containing every account present in cluster associations. */
const availableAccounts = computed<Set<string>>(() => {
  const accounts = new Set<string>()
  if (!data.value) {
    return accounts
  }
  for (const association of data.value) {
    accounts.add(association.account)
  }
  return accounts
})

/* Auto expand the tree until the total number of visible nodes reaches
 * MAX_AUTO_EXPANDED. */
function autoExpandTree(nodes: ClusterAccountTreeNode[]) {
  const queue = [...nodes]
  expandedAccounts.value = new Set()
  let visibleCount = nodes.length

  // nothing to do if the first level already exceeds the limit
  if (visibleCount >= MAX_AUTO_EXPANDED) {
    return
  }

  while (queue.length > 0 && visibleCount < MAX_AUTO_EXPANDED) {
    const node = queue.shift()
    if (!node) continue
    if (node.children.length === 0 || expandedAccounts.value.has(node.account)) {
      continue
    }

    expandedAccounts.value.add(node.account)
    visibleCount += node.children.length
    queue.push(...node.children)
  }
}

/* Watch the account tree and auto expand it if it has not been auto expanded
 * yet. */
watch(
  accountTree,
  (tree) => {
    if (!tree.length) {
      expandedAccounts.value = new Set()
      autoExpandedOnce.value = false
      return
    }

    // keep only accounts that are still present in the cluster associations
    expandedAccounts.value = new Set(
      [...expandedAccounts.value].filter((account) => availableAccounts.value.has(account))
    )

    if (!autoExpandedOnce.value) {
      autoExpandTree(tree)
      autoExpandedOnce.value = true
    }
  },
  { immediate: true }
)
</script>

<template>
  <ClusterMainLayout menu-entry="accounts" :cluster="cluster" :breadcrumb="[{ title: 'Accounts' }]">
    <div class="mx-auto flex items-center justify-between">
      <div class="px-4 py-16 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Accounts</h1>
        <p class="mt-4 max-w-xl text-sm font-light text-gray-600 dark:text-gray-300">
          Accounts defined on cluster
        </p>
      </div>
      <div v-if="loaded" class="mt-4 text-right text-gray-600 dark:text-gray-300">
        <div class="text-5xl font-bold">{{ availableAccounts.size }}</div>
        <div class="text-sm font-light">
          account{{ availableAccounts.size > 1 ? 's' : '' }} found
        </div>
      </div>
      <div v-else class="flex animate-pulse space-x-4">
        <div class="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
      </div>
    </div>
    <ErrorAlert v-if="unable"
      >Unable to retrieve associations from cluster
      <span class="font-medium">{{ cluster }}</span></ErrorAlert
    >
    <div v-else-if="!loaded" class="mt-6 text-gray-400 dark:text-gray-500">
      <LoadingSpinner :size="5" />
      Loading accounts…
    </div>
    <InfoAlert v-else-if="data?.length == 0"
      >No association defined on cluster <span class="font-medium">{{ cluster }}</span></InfoAlert
    >
    <div v-else class="mt-8 flow-root">
      <div class="-mx-4 sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div class="overflow-hidden">
            <ul role="list" class="space-y-4">
              <AccountTreeNode
                v-for="(node, index) in accountTree"
                :key="node.account"
                :node="node"
                :expanded-accounts="expandedAccounts"
                :is-last="index === accountTree.length - 1"
                :cluster="cluster"
                @toggle="toggleAccount"
              />
            </ul>
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
