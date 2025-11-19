<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ClusterAccountTreeNode } from '@/composables/GatewayAPI'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  UsersIcon,
  QueueListIcon
} from '@heroicons/vue/20/solid'

const { node, expandedAccounts, isLast, cluster } = defineProps<{
  node: ClusterAccountTreeNode
  expandedAccounts: Set<string>
  isLast?: boolean
  cluster: string
}>()

const emit = defineEmits<{
  toggle: [account: string]
}>()

const isExpanded = computed(() => expandedAccounts.has(node.account))
const hasChildren = computed(() => node.children.length > 0)

function countDescendants(node: ClusterAccountTreeNode): number {
  let count = 0
  for (const child of node.children) {
    count += 1 + countDescendants(child)
  }
  return count
}

function collectDescendantUsers(node: ClusterAccountTreeNode, users: Set<string>) {
  for (const child of node.children) {
    for (const user of child.users ?? []) {
      if (user) {
        users.add(user)
      }
    }
    collectDescendantUsers(child, users)
  }
}

const subaccountCount = computed(() => countDescendants(node))
const subaccountUsersCount = computed(() => {
  const users = new Set<string>()
  collectDescendantUsers(node, users)
  return users.size
})

function toggle() {
  emit('toggle', node.account)
}
</script>

<template>
  <li>
    <div class="relative">
      <!-- Vertical connecting line -->
      <div
        v-if="node.level > 0"
        class="absolute -top-2 left-4 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-gray-700"
        :class="isLast ? '' : '-bottom-8'"
      ></div>

      <!-- Horizontal connecting line for nested items -->
      <div
        v-if="node.level > 0"
        class="absolute top-7 left-4 h-0.5 w-8 bg-gray-200 dark:bg-gray-700"
      ></div>

      <!-- Connector dot -->
      <div
        v-if="node.level > 0"
        class="absolute top-7 left-4 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-2 border-white bg-gray-300 dark:border-gray-800 dark:bg-gray-600"
      ></div>

      <!-- Main content card -->
      <div
        :id="`account-tree-node-${node.account}`"
        class="relative flex items-center gap-x-4 rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200 transition-shadow ring-inset hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
        :class="node.level > 0 ? 'ml-12' : ''"
      >
        <!-- Expand/Collapse button -->
        <div class="flex-shrink-0">
          <button
            v-if="hasChildren"
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            @click="toggle"
          >
            <span class="sr-only">Toggle {{ node.account }}</span>
            <ChevronRightIcon
              v-if="!isExpanded"
              class="h-5 w-5 transition-transform duration-200"
              :class="{ 'rotate-90': isExpanded }"
              aria-hidden="true"
            />
            <ChevronDownIcon
              v-else
              class="h-5 w-5 transition-transform duration-200"
              aria-hidden="true"
            />
          </button>
          <div v-else class="h-8 w-8"></div>
        </div>

        <!-- Account content -->
        <div class="flex min-w-0 flex-auto items-center justify-between gap-3">
          <p class="text-sm leading-6 font-semibold text-gray-900 dark:text-gray-100">
            {{ node.account }}
          </p>
          <div class="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
            <template v-if="!isExpanded && hasChildren">
              <div
                class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700"
              >
                <QueueListIcon class="h-3.5 w-3.5" />
                <span>{{ subaccountCount }} subaccount{{ subaccountCount > 1 ? 's' : '' }}</span>
              </div>
              <div
                class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700"
              >
                <UsersIcon class="h-3.5 w-3.5" />
                <span
                  >{{ subaccountUsersCount }} user{{ subaccountUsersCount > 1 ? 's' : '' }}</span
                >
              </div>
            </template>
            <template v-else>
              <div
                v-if="node.users && node.users.length > 0"
                class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700"
              >
                <UsersIcon class="h-3.5 w-3.5" />
                <span>{{ node.users.length }} user{{ node.users.length > 1 ? 's' : '' }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
      <!-- Children -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 -translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <ul
          v-if="hasChildren && isExpanded"
          role="list"
          class="mt-2 space-y-2"
          :class="node.level > 0 ? 'ml-16' : 'ml-4'"
        >
          <AccountTreeNode
            v-for="(child, index) in node.children"
            :key="child.account"
            :node="child"
            :expanded-accounts="expandedAccounts"
            :is-last="index === node.children.length - 1"
            :cluster="cluster"
            @toggle="emit('toggle', $event)"
          />
        </ul>
      </Transition>
    </div>
  </li>
</template>
