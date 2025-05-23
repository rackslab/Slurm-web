<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  CalendarIcon,
  Cog6ToothIcon,
  HomeIcon,
  PlayCircleIcon,
  CpuChipIcon,
  SwatchIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { TagIcon } from '@heroicons/vue/16/solid'

import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'

const { entry } = defineProps<{
  entry: string
}>()

const sidebarOpen = defineModel<boolean>()

const runtimeStore = useRuntimeStore()
const runtimeConfiguration = useRuntimeConfiguration()
const navigation = [
  { name: 'Dashboard', route: 'dashboard', icon: HomeIcon, permission: 'view-stats' },
  { name: 'Jobs', route: 'jobs', icon: PlayCircleIcon, permission: 'view-jobs' },
  { name: 'Resources', route: 'resources', icon: CpuChipIcon, permission: 'view-nodes' },
  { name: 'QOS', route: 'qos', icon: SwatchIcon, permission: 'view-qos' },
  {
    name: 'Reservations',
    route: 'reservations',
    icon: CalendarIcon,
    permission: 'view-reservations'
  }
]
</script>

<template>
  <TransitionRoot as="template" :show="sidebarOpen">
    <Dialog as="div" class="relative z-50 lg:hidden" @close="sidebarOpen = false">
      <TransitionChild
        as="template"
        enter="transition-opacity ease-linear duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/80" />
      </TransitionChild>

      <div class="fixed inset-0 flex">
        <TransitionChild
          as="template"
          enter="transition ease-in-out duration-300 transform"
          enter-from="-translate-x-full"
          enter-to="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leave-from="translate-x-0"
          leave-to="-translate-x-full"
        >
          <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
            <TransitionChild
              as="template"
              enter="ease-in-out duration-300"
              enter-from="opacity-0"
              enter-to="opacity-100"
              leave="ease-in-out duration-300"
              leave-from="opacity-100"
              leave-to="opacity-0"
            >
              <div class="absolute top-0 left-full flex w-16 justify-center pt-5">
                <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                  <span class="sr-only">Close sidebar</span>
                  <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
            </TransitionChild>

            <!-- Sidebar component -->
            <div
              class="bg-slurmweb flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4 dark:bg-gray-700"
            >
              <div class="flex h-16 shrink-0 items-center justify-center">
                <img class="flex h-12" src="/logo/slurm-web_horizontal.png" alt="Slurm-web" />
              </div>
              <div
                class="text-slurmweb-dark dark:text-slurmweb mx-8 -mt-10 mb-6 text-right text-xs"
              >
                <TagIcon class="inline size-3" aria-hidden="true" />
                {{ runtimeConfiguration.version }}
              </div>
              <nav class="flex flex-1 flex-col">
                <ul role="list" class="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" class="-mx-2 space-y-1">
                      <li v-for="item in navigation" :key="item.name">
                        <RouterLink
                          v-if="runtimeStore.hasPermission(item.permission)"
                          :to="{ name: item.route }"
                          :class="[
                            item.route == entry
                              ? 'bg-slurmweb-dark dark:bg-slurmweb-verydark text-white'
                              : 'text-slurmweb-font-disabled dark:text-slurmweb-font-disabled/80 hover:text-white',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          ]"
                          @click="sidebarOpen = false"
                        >
                          <component
                            :is="item.icon"
                            :class="[
                              item.route == entry
                                ? 'text-white'
                                : 'text-slurmweb-font-disabled group-hover:text-white',
                              'h-6 w-6 shrink-0'
                            ]"
                            aria-hidden="true"
                          />
                          {{ item.name }}
                        </RouterLink>
                      </li>
                    </ul>
                  </li>
                  <li class="mt-auto">
                    <RouterLink
                      :to="{ name: 'settings' }"
                      class="text-slurmweb-light hover:bg-slurmweb-dark hover:dark:bg-slurmweb-verydark group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold hover:text-white"
                    >
                      <Cog6ToothIcon
                        class="text-slurmweb-font-disabled h-6 w-6 shrink-0 group-hover:text-white"
                        aria-hidden="true"
                      />
                      Settings
                    </RouterLink>
                  </li>
                </ul>
              </nav>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Static sidebar for desktop -->
  <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
    <!-- Sidebar component, swap this element with another sidebar if you like -->
    <div class="bg-slurmweb flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4 dark:bg-gray-700">
      <div class="flex h-24 shrink-0 items-center">
        <img src="/logo/slurm-web_horizontal.png" alt="Slurm-web" class="block dark:hidden" />
        <img src="/logo/slurm-web_horizontal_dark.png" alt="Slurm-web" class="hidden dark:block" />
      </div>
      <div class="text-slurmweb-dark dark:text-slurmweb -mt-12 mb-4 text-right text-xs">
        <TagIcon class="inline size-3" aria-hidden="true" /> {{ runtimeConfiguration.version }}
      </div>
      <nav class="flex flex-1 flex-col">
        <ul role="list" class="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" class="-mx-2 space-y-1">
              <li v-for="item in navigation" :key="item.name">
                <RouterLink
                  v-if="runtimeStore.hasPermission(item.permission)"
                  :to="{ name: item.route }"
                  :class="[
                    item.route == entry
                      ? 'bg-slurmweb-dark dark:bg-slurmweb-verydark text-white'
                      : 'hover:slurmweb-dark text-slurmweb-font-disabled dark:text-slurmweb-font-disabled/80 hover:text-white',
                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                  ]"
                >
                  <component :is="item.icon" :class="['h-6 w-6 shrink-0']" aria-hidden="true" />
                  {{ item.name }}
                </RouterLink>
              </li>
            </ul>
          </li>
          <li class="mt-auto">
            <RouterLink
              :to="{ name: 'settings' }"
              class="text-slurmweb-light hover:bg-slurmweb-dark hover:dark:bg-slurmweb-verydark group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold hover:text-white"
            >
              <Cog6ToothIcon class="h-6 w-6 shrink-0" aria-hidden="true" />
              Settings
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
