<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { RouteRecordName } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { ServerIcon } from '@heroicons/vue/24/outline'
const { cluster } = defineProps<{ cluster: string }>()

const route = useRoute()
const runtimeStore = useRuntimeStore()
</script>

<template>
  <template v-if="runtimeStore.getAllowedClusters().length > 1">
    <Popover class="relative">
      <PopoverButton
        class="hover:bg-slurmweb-light hover:dark:bg-slurmweb-dark/30 inline-flex items-center gap-x-1 rounded-sm p-3 leading-6 font-bold text-transparent hover:text-gray-900 focus:outline-hidden hover:dark:text-gray-200"
      >
        <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
        <span class="text-gray-700 dark:text-gray-400">{{ cluster }}</span>
      </PopoverButton>

      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <PopoverPanel
          v-slot="{ close }"
          class="absolute left-0 z-10 mt-5 flex w-screen max-w-max px-0"
        >
          <div
            class="w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5 dark:bg-gray-700"
          >
            <div class="p-4">
              <div
                v-for="cluster in runtimeStore.getAllowedClusters()"
                :key="cluster.name"
                class="group relative flex gap-x-6 rounded-lg p-4 hover:bg-gray-50 hover:dark:bg-gray-800"
              >
                <div
                  v-if="cluster.permissions.actions.length > 0"
                  class="mt-1 flex items-center justify-evenly gap-x-1.5"
                >
                  <div
                    :class="[
                      cluster.error ? 'bg-orange-500/20' : 'bg-emerald-500/20',
                      'flex-none rounded-full p-1'
                    ]"
                  >
                    <div
                      :class="[
                        cluster.error ? 'bg-orange-500' : 'bg-emerald-500',
                        'h-1.5 w-1.5 rounded-full'
                      ]"
                    />
                  </div>
                </div>

                <RouterLink
                  :to="{
                    name: route.name as RouteRecordName,
                    params: { cluster: cluster.name },
                    query: route.query
                  }"
                  class="flex grow font-semibold text-gray-900 dark:text-gray-200"
                  @click="close()"
                >
                  {{ cluster.name }}
                  <span class="absolute inset-0" />
                </RouterLink>

                <span
                  v-if="cluster.stats"
                  class="mt-1 flex w-30 text-xs leading-5 text-gray-500 dark:text-gray-400"
                >
                  <ServerIcon class="mx-1 h-5" />
                  {{ cluster.stats.resources.nodes }} node{{
                    cluster.stats.resources.nodes > 1 ? 's' : ''
                  }}
                </span>
              </div>
            </div>
          </div>
        </PopoverPanel>
      </transition>
    </Popover>
  </template>
  <span
    v-else
    class="inline-flex items-center gap-x-1 rounded-sm p-3 leading-6 font-bold text-gray-700"
  >
    {{ cluster }}
  </span>
</template>
