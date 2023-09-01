<script setup lang="ts">
import { RouterLink } from 'vue-router'

const props = defineProps({
  entry: {
    type: String,
    required: true
  }
})
const tabs = [
  { name: 'General', href: 'settings' },
  { name: 'Errors', href: 'settings-errors' },
  { name: 'Account', href: 'settings-account' }
]
</script>
<template>
  <div class="border-b border-gray-200">
    <div class="sm:flex sm:items-baseline">
      <h3 class="text-base font-semibold leading-6 text-gray-900">Settings</h3>
      <div class="mt-4 sm:ml-10 sm:mt-0">
        <nav class="-mb-px flex space-x-8">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.name"
            :to="{ name: tab.href }"
            :class="[
              props.entry == tab.name
                ? 'border-slurmweb-dark text-slurmweb-dark'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
            ]"
            :aria-current="props.entry == tab.name ? 'page' : undefined"
            >{{ tab.name }}</RouterLink
          >
        </nav>
      </div>
    </div>
  </div>
</template>
