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

import { useRuntimeStore } from '@/stores/runtime'

const runtimeStore = useRuntimeStore()
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
  <TransitionRoot as="template" :show="runtimeStore.sidebarOpen">
    <Dialog as="div" class="relative z-50 lg:hidden" @close="runtimeStore.sidebarOpen = false">
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
              <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  class="-m-2.5 p-2.5"
                  @click="runtimeStore.sidebarOpen = false"
                >
                  <span class="sr-only">Close sidebar</span>
                  <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
            </TransitionChild>

            <!-- Sidebar component -->
            <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-slurmweb px-6 pb-4">
              <div class="flex h-16 shrink-0 items-center justify-center">
                <img
                  class="flex h-12"
                  src="/logo/bitmaps/slurm-web_horizontal_bgblue_small.png"
                  alt="Slurm-web"
                />
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
                            item.route == runtimeStore.navigation
                              ? 'bg-slurmweb-dark text-white'
                              : 'text-slurmweb-font-disabled hover:text-white',
                            'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                          ]"
                        >
                          <component
                            :is="item.icon"
                            :class="[
                              item.route == runtimeStore.navigation
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
                      class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-slurmweb-font-disabled hover:bg-slurmweb-dark hover:text-white"
                    >
                      <Cog6ToothIcon
                        class="h-6 w-6 shrink-0 text-slurmweb-font-disabled group-hover:text-white"
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
    <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-slurmweb px-6 pb-4">
      <div class="flex h-24 shrink-0 items-center">
        <img src="/logo/bitmaps/slurm-web_horizontal_bgblue_small.png" alt="Slurm-web" />
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
                    item.route == runtimeStore.navigation
                      ? 'bg-slurmweb-dark text-white'
                      : 'hover:slurmweb-dark text-slurmweb-font-disabled hover:text-white',
                    'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
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
              class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-slurmweb-light hover:bg-slurmweb-dark hover:text-white"
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
