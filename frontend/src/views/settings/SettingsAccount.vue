<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import SettingsHeader from '@/components/settings/SettingsHeader.vue'
import { useRuntimeStore } from '@/stores/runtime'
import { useAuthStore } from '@/stores/auth'

const runtimeStore = useRuntimeStore()
const authStore = useAuthStore()
</script>

<template>
  <SettingsTabs entry="Account" />
  <div class="px-4 pt-16 sm:px-6 lg:px-8">
    <SettingsHeader title="Account" description="Personal account information and permissions." />
    <div class="mt-6 border-t border-gray-100 dark:border-gray-700">
      <dl class="divide-y divide-gray-100 dark:divide-gray-700">
        <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">Username</dt>
          <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
            {{ authStore.username }}
          </dd>
        </div>
        <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">Full name</dt>
          <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
            {{ authStore.fullname }}
          </dd>
        </div>
        <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">Groups</dt>
          <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
            {{ authStore.groups?.join(', ') }}
          </dd>
        </div>
      </dl>
    </div>
    <div class="pt-16 sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base leading-6 font-semibold text-gray-900 dark:text-gray-100">
          Clusters permissions
        </h1>
      </div>
    </div>
    <div class="mt-6 border-t border-gray-100 dark:border-gray-700">
      <dl class="divide-y divide-gray-100 dark:divide-gray-700">
        <div
          v-for="cluster in runtimeStore.getAllowedClusters()"
          :key="cluster.name"
          class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
        >
          <dt class="text-sm leading-6 font-medium text-gray-900 dark:text-gray-100">
            {{ cluster.name }}
          </dt>
          <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
            Roles :
            <ul class="mb-4 ml-6 list-disc">
              <li v-for="role in cluster.permissions.roles.sort()" :key="role">{{ role }}</li>
            </ul>
            Actions :
            <ul class="ml-6 list-disc">
              <li v-for="action in cluster.permissions.actions.sort()" :key="action">
                {{ action }}
              </li>
            </ul>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
