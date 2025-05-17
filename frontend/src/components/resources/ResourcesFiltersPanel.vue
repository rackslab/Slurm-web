<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useRuntimeStore } from '@/stores/runtime'
import { resourcesStates } from '@/stores/runtime/resources'
import PartitionFilterSelector from '@/components/filters/PartitionFilterSelector.vue'
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import { ChevronDownIcon, BoltIcon, RectangleGroupIcon } from '@heroicons/vue/20/solid'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const { cluster, nbNodes } = defineProps<{ cluster: string; nbNodes: number }>()

const runtimeStore = useRuntimeStore()
</script>

<template>
  <TransitionRoot as="template" :show="runtimeStore.resources.openFiltersPanel">
    <Dialog as="div" class="relative z-40" @close="runtimeStore.resources.openFiltersPanel = false">
      <TransitionChild
        as="template"
        enter="ease-in-out duration-500"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in-out duration-500"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-400/50 transition-opacity dark:bg-gray-900/60" />
      </TransitionChild>

      <div class="fixed inset-0 z-40 flex">
        <TransitionChild
          as="template"
          enter="transition ease-in-out duration-300 transform"
          enter-from="translate-x-full"
          enter-to="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leave-from="translate-x-0"
          leave-to="translate-x-full"
        >
          <DialogPanel
            class="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl dark:bg-gray-700"
          >
            <div class="flex items-center justify-between px-4">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                Filters
                <span
                  class="text-slurmweb dark:text-slurmweb-light dark:bg-slurmweb-verydark ml-3 hidden rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium md:inline-block"
                  >{{ nbNodes }}</span
                >
              </h2>
              <button
                type="button"
                class="-mr-2 flex h-10 w-10 items-center justify-center rounded-md p-2 text-gray-400"
                @click="runtimeStore.resources.openFiltersPanel = false"
              >
                <span class="sr-only">Close menu</span>
                <XMarkIcon class="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <!-- Filters -->
            <form class="mt-4">
              <Disclosure
                as="div"
                class="border-t border-gray-200 px-4 py-6 dark:border-gray-600"
                v-slot="{ open }"
              >
                <h3 class="-mx-2 -my-3 flow-root">
                  <DisclosureButton
                    class="flex w-full items-center justify-between px-2 py-3 text-sm text-gray-400"
                  >
                    <span class="flex">
                      <BoltIcon
                        class="-mt-1 mr-2 -ml-1 h-8 w-8 rounded-full bg-gray-600 p-2 text-white dark:bg-gray-500"
                      />
                      <span class="font-medium text-gray-900 dark:text-gray-100">State</span>
                    </span>
                    <span class="ml-6 flex items-center">
                      <ChevronDownIcon
                        :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                        aria-hidden="true"
                      />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel class="pt-6">
                  <div class="space-y-6">
                    <div
                      v-for="(state, optionIdx) in resourcesStates"
                      :key="state.value"
                      class="flex items-center"
                    >
                      <input
                        :id="`filter-mobile-${state.value}-${optionIdx}`"
                        :name="`state-${state.value}[]`"
                        :value="state.value"
                        type="checkbox"
                        v-model="runtimeStore.resources.filters.states"
                        class="text-slurmweb focus:ring-slurmweb h-4 w-4 rounded-sm border-gray-300"
                      />
                      <label
                        :for="`filter-mobile-${state.value}-${optionIdx}`"
                        class="ml-3 text-sm text-gray-500 dark:text-gray-300"
                        >{{ state.label }}</label
                      >
                    </div>
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure
                v-if="runtimeStore.hasPermission('view-partitions')"
                as="div"
                class="border-t border-t-gray-200 px-4 py-6 dark:border-t-gray-600"
                v-slot="{ open }"
              >
                <h3 class="-mx-2 -my-3 flow-root">
                  <DisclosureButton
                    class="flex w-full items-center justify-between px-2 py-3 text-sm text-gray-400"
                  >
                    <span class="flex">
                      <RectangleGroupIcon
                        class="-mt-1 mr-2 -ml-1 h-8 w-8 rounded-full bg-amber-700 p-2 text-white"
                      />
                      <span class="font-medium text-gray-900 dark:text-gray-100">Partitions</span>
                    </span>
                    <span class="ml-6 flex items-center">
                      <ChevronDownIcon
                        :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                        aria-hidden="true"
                      />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel class="pt-6">
                  <PartitionFilterSelector
                    :cluster="cluster"
                    v-model="runtimeStore.resources.filters.partitions"
                  />
                </DisclosurePanel>
              </Disclosure>
            </form>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
