<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import { useClusterDataGetter } from '@/composables/DataGetter'
import type { AccountDescription } from '@/composables/GatewayAPI'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid'

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue'

const { cluster } = defineProps<{ cluster: string }>()

const runtimeStore = useRuntimeStore()
const query = ref('')

const filteredAccounts = computed(() => {
  if (!data.value) {
    return []
  }
  return query.value === ''
    ? data.value
    : data.value.filter((account) => account.name.toLowerCase().includes(query.value.toLowerCase()))
})

function queryPlaceholder() {
  if (runtimeStore.jobs.filters.accounts.length == 0) {
    return 'Search account…'
  } else {
    return runtimeStore.jobs.filters.accounts.join(', ')
  }
}

const { data } = useClusterDataGetter<AccountDescription[]>(cluster, 'accounts')
</script>

<template>
  <div class="relative mt-2">
    <Combobox as="div" v-model="runtimeStore.jobs.filters.accounts" multiple>
      <ComboboxInput
        class="focus:ring-slurmweb w-full rounded-md border-0 bg-white py-1.5 pr-12 pl-3 shadow-xs ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700"
        @change="query = $event.target.value"
        :placeholder="queryPlaceholder()"
      />
      <ComboboxButton
        class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-hidden"
      >
        <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </ComboboxButton>

      <ComboboxOptions
        v-if="filteredAccounts.length > 0"
        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm dark:bg-gray-800"
      >
        <ComboboxOption
          v-for="account in filteredAccounts"
          :key="account.name"
          :value="account.name"
          as="template"
          v-slot="{ active, selected }"
        >
          <li
            :class="[
              'relative cursor-default py-2 pr-9 pl-3 select-none',
              active
                ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
                : 'text-gray-900 dark:text-gray-400'
            ]"
          >
            <div class="flex">
              <span :class="['truncate', selected && 'font-semibold']">
                {{ account.name }}
              </span>
            </div>

            <span
              v-if="selected"
              :class="[
                'absolute inset-y-0 right-0 flex items-center pr-4',
                active ? 'text-white' : 'text-slurmweb'
              ]"
            >
              <CheckIcon class="h-5 w-5" aria-hidden="true" />
            </span>
          </li>
        </ComboboxOption>
      </ComboboxOptions>
    </Combobox>
  </div>
</template>
