<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import SettingsHeader from '@/components/settings/SettingsHeader.vue'
import { useRuntimeStore } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()
</script>

<template>
  <SettingsTabs entry="Errors" />
  <div class="px-4 pt-16 sm:px-6 lg:px-8">
    <SettingsHeader title="Errors" description="List of errors triggered by application." />
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead>
              <tr class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                <th scope="col" class="py-3.5 pr-3 pl-4 text-left sm:pl-3">Timestamp</th>
                <th scope="col" class="px-3 py-3.5 text-left">Route</th>
                <th scope="col" class="px-3 py-3.5 text-left">Message</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              <tr
                v-for="error in runtimeStore.errors"
                :key="error.message"
                class="even:bg-gray-50 even:dark:bg-gray-800"
              >
                <td
                  class="py-4 pr-3 pl-4 font-medium whitespace-nowrap text-gray-900 sm:pl-3 dark:text-gray-100"
                >
                  {{ error.timestamp.toLocaleString() }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ error.route }}
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {{ error.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
