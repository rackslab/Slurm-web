<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import SettingsHeader from '@/components/settings/SettingsHeader.vue'
import { useRuntimeStore } from '@/stores/runtime'
import { Switch } from '@headlessui/vue'

const runtimeStore = useRuntimeStore()
</script>

<template>
  <SettingsTabs entry="General" />
  <div class="px-4 pt-16 sm:px-6 lg:px-8">
    <SettingsHeader
      title="General Settings"
      description="Configure general application preferences."
    />
    <div>
      <dl
        class="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm/6 dark:divide-gray-700 dark:border-gray-700"
      >
        <div class="py-6 sm:flex">
          <dt class="font-medium text-gray-900 sm:w-72 sm:flex-none sm:pr-6 dark:text-gray-100">
            Show node names on cluster diagram
          </dt>
          <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
            <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
              When enabled, node names are displayed on the cluster diagram, provided there is
              enough space. Names are shown with adaptive sizing and automatically positioned based
              on node dimensions.
            </p>
            <Switch
              v-model="runtimeStore.resources.showNodeNames"
              :class="[
                runtimeStore.resources.showNodeNames
                  ? 'bg-slurmweb dark:bg-slurmweb'
                  : 'bg-gray-200 dark:bg-gray-600',
                'focus:ring-slurmweb relative mt-1 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none'
              ]"
            >
              <span class="sr-only">Use setting</span>
              <span
                :class="[
                  runtimeStore.resources.showNodeNames ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                ]"
              />
            </Switch>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
