<script setup lang="ts">
import SettingsLayout from '@/components/settings/SettingsLayout.vue'
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import { useRuntimeStore } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()
</script>

<template>
  <SettingsLayout>
    <SettingsTabs entry="Errors" />
    <div class="px-4 pt-16 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base font-semibold leading-6 text-gray-900">Errors</h1>
          <p class="mt-2 text-sm text-gray-700">List of errors triggered by application.</p>
        </div>
      </div>
      <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table class="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                  >
                    Timestamp
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Route
                  </th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <tr
                  v-for="error in runtimeStore.errors"
                  :key="error.message"
                  class="even:bg-gray-50"
                >
                  <td
                    class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3"
                  >
                    {{ error.timestamp.toLocaleString() }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ error.route }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ error.message }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </SettingsLayout>
</template>
