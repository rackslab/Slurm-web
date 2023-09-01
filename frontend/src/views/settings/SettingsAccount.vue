<script setup lang="ts">
import SettingsLayout from '@/components/settings/SettingsLayout.vue'
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
import { useRuntimeStore } from '@/stores/runtime'
import { useAuthStore } from '@/stores/auth'

const runtimeStore = useRuntimeStore()
const authStore = useAuthStore()
</script>

<template>
  <SettingsLayout>
    <SettingsTabs entry="Account" />
    <div class="pt-16 px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base font-semibold leading-6 text-gray-900">Account</h1>
          <p class="mt-2 text-sm text-gray-700">Personal account information and permissions.</p>
        </div>
      </div>
      <div class="mt-6 border-t border-gray-100">
        <dl class="divide-y divide-gray-100">
          <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt class="text-sm font-medium leading-6 text-gray-900">Username</dt>
            <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {{ authStore.username }}
            </dd>
          </div>
          <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt class="text-sm font-medium leading-6 text-gray-900">Full name</dt>
            <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {{ authStore.fullname }}
            </dd>
          </div>
          <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt class="text-sm font-medium leading-6 text-gray-900">Groups</dt>
            <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {{ authStore.groups?.join(', ') }}
            </dd>
          </div>
        </dl>
      </div>
      <div class="pt-16 sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base font-semibold leading-6 text-gray-900">Clusters permissions</h1>
        </div>
      </div>
      <div class="mt-6 border-t border-gray-100">
        <dl class="divide-y divide-gray-100">
          <div
            v-for="cluster in runtimeStore.availableClusters"
            :key="cluster.name"
            class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
          >
            <dt class="text-sm font-medium leading-6 text-gray-900">{{ cluster.name }}</dt>
            <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              Roles :
              <ul class="list-disc ml-6 mb-4">
                <li v-for="role in cluster.permissions.roles.sort()">{{ role }}</li>
              </ul>
              Actions :
              <ul class="list-disc ml-6">
                <li v-for="action in cluster.permissions.actions.sort()">{{ action }}</li>
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </SettingsLayout>
</template>
