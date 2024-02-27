<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import { useClusterDataGetter } from '@/composables/DataGetter'
import type { ClusterPartition } from '@/composables/GatewayAPI'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid'

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const runtimeStore = useRuntimeStore()
const query = ref('')

const filteredPartitions = computed(() => {
  if (!data.value) {
    return []
  }
  return query.value === ''
    ? data.value
    : data.value.filter((partition) =>
        partition.name.toLowerCase().includes(query.value.toLowerCase())
      )
})

function queryPlaceholder() {
  if (runtimeStore.jobs.filters.partitions.length == 0) {
    return 'Search partitions…'
  } else {
    return runtimeStore.jobs.filters.partitions.join(', ')
  }
}

const { data } = useClusterDataGetter<ClusterPartition[]>('partitions', props.cluster)
</script>

<template>
  <div class="relative mt-2">
    <Combobox as="div" v-model="runtimeStore.jobs.filters.partitions" multiple>
      <ComboboxInput
        class="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6"
        @change="query = $event.target.value"
        :placeholder="queryPlaceholder()"
      />
      <ComboboxButton
        class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none"
      >
        <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </ComboboxButton>

      <ComboboxOptions
        v-if="filteredPartitions.length > 0"
        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
      >
        <ComboboxOption
          v-for="partition in filteredPartitions"
          :key="partition.name"
          :value="partition.name"
          as="template"
          v-slot="{ active, selected }"
        >
          <li
            :class="[
              'relative cursor-default select-none py-2 pl-3 pr-9',
              active ? 'bg-slurmweb text-white' : 'text-gray-900'
            ]"
          >
            <div class="flex">
              <span :class="['truncate', selected && 'font-semibold']">
                {{ partition.name }}
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
