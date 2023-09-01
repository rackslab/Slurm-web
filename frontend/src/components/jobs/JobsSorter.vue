<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon, BarsArrowDownIcon, BarsArrowUpIcon } from '@heroicons/vue/20/solid'
import { useRuntimeStore, type JobSortCriterion } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()

const sortOptions = [
  { name: '#ID', type: 'id' },
  { name: 'State', type: 'state' },
  { name: 'User', type: 'user' },
  { name: 'Priority', type: 'priority' }
]

const emit = defineEmits(['sort'])

function sortSelected(newCriteria: JobSortCriterion) {
  runtimeStore.jobs.sort = newCriteria
  emit('sort')
}

function triggerSortOrder() {
  console.log(`Trigger job sorter order: ${runtimeStore.jobs.order}`)
  if (runtimeStore.jobs.order == 'asc') {
    runtimeStore.jobs.order = 'desc'
  } else {
    runtimeStore.jobs.order = 'asc'
  }
  emit('sort')
}
</script>
<template>
  <div class="group inline-flex">
    <button
      @click="triggerSortOrder()"
      class="mr-1 h-5 w-5 text-gray-400 group-hover:text-gray-500"
    >
      <BarsArrowDownIcon v-if="runtimeStore.jobs.order === 'asc'" />
      <BarsArrowUpIcon v-else />
    </button>
    <Menu as="div" class="relative inline-block text-left">
      <div>
        <MenuButton
          class="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sort
          <ChevronDownIcon
            class="-mr-1 ml-1 h-5 w-5 text-gray-400 group-hover:text-gray-500"
            aria-hidden="true"
          />
        </MenuButton>
      </div>

      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems
          class="absolute left-0 z-10 mt-2 w-40 origin-top-left rounded-md bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          <div class="py-1">
            <MenuItem v-for="option in sortOptions" :key="option.name" v-slot="{ active }">
              <a
                @click="sortSelected(option.type as JobSortCriterion)"
                :class="[
                  option.type == runtimeStore.jobs.sort
                    ? 'font-medium text-gray-900'
                    : 'text-gray-500',
                  active ? 'bg-gray-100' : '',
                  'block px-4 py-2 text-sm'
                ]"
                >{{ option.name }}</a
              >
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>
