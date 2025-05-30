<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import { useAuthStore } from '@/stores/auth'
import { Bars3Icon, ArrowRightOnRectangleIcon, ServerStackIcon } from '@heroicons/vue/24/outline'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'
import MainMenu from '@/components/MainMenu.vue'
import ClustersPopOver from '@/components/ClustersPopOver.vue'

type BreadcrumbPart = {
  title: string
  routeName?: string
}

const { menuEntry, cluster, breadcrumb } = defineProps<{
  menuEntry: string
  cluster: string
  breadcrumb: BreadcrumbPart[]
}>()

const clusterNotFound: Ref<boolean> = ref(false)
const sidebarOpen = ref(false)
const runtimeStore = useRuntimeStore()
const runtimeConfiguration = useRuntimeConfiguration()
const authStore = useAuthStore()

onMounted(() => {
  if (!runtimeStore.checkClusterAvailable(cluster)) {
    clusterNotFound.value = true
  }
})
</script>

<template>
  <MainMenu :entry="menuEntry" v-model="sidebarOpen" />
  <div class="lg:pl-72">
    <div
      class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white shadow-xs sm:gap-x-6 lg:px-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <button
        type="button"
        class="-m-2.5 p-2.5 text-gray-700 lg:hidden dark:text-gray-300"
        @click="sidebarOpen = true"
      >
        <span class="sr-only">Open sidebar</span>
        <Bars3Icon class="h-6 w-6" aria-hidden="true" />
      </button>

      <!-- Separator -->
      <div class="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />

      <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div class="relative mt-1 flex flex-1 items-center">
          <ClustersPopOver :cluster="cluster" />
          <span v-for="breadcrumbPart in breadcrumb" :key="breadcrumbPart.title" class="flex">
            <ChevronRightIcon class="h-5 w-10 shrink-0 text-gray-400" aria-hidden="true" />
            <router-link
              v-if="breadcrumbPart.routeName"
              :to="{ name: breadcrumbPart.routeName }"
              class="text-black dark:text-gray-200"
              >{{ breadcrumbPart.title }}</router-link
            >
            <span v-else class="text-black dark:text-gray-200">{{ breadcrumbPart.title }}</span>
          </span>
        </div>
        <div class="flex items-center gap-x-4 lg:gap-x-6">
          <!-- Selects clusters button-->
          <RouterLink :to="{ name: 'clusters' }" custom v-slot="{ navigate }">
            <button
              @click="navigate"
              role="link"
              class="p-2.5 text-gray-400 hover:text-gray-500 lg:-m-2.5 dark:text-gray-400 hover:dark:text-gray-200"
            >
              <ServerStackIcon class="h-6 w-6" />
            </button>
          </RouterLink>

          <!-- Separator -->
          <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

          <!-- Profile -->
          <span v-if="runtimeConfiguration.authentication" class="hidden lg:flex lg:items-center">
            <span
              class="m-2 text-sm leading-6 font-semibold text-gray-900 dark:text-gray-200"
              aria-hidden="true"
            >
              {{ authStore.fullname }}
            </span>
          </span>

          <!-- Signout button -->
          <RouterLink
            v-if="runtimeConfiguration.authentication"
            :to="{ name: 'signout' }"
            custom
            v-slot="{ navigate }"
          >
            <button
              @click="navigate"
              role="link"
              class="p-2.5 text-gray-400 hover:text-gray-500 lg:-m-2.5 dark:text-gray-400 hover:dark:text-gray-200"
            >
              <ArrowRightOnRectangleIcon class="h-6 w-6" />
            </button>
          </RouterLink>
        </div>
      </div>
    </div>

    <main class="py-10">
      <div class="px-4 sm:px-6 lg:px-8">
        <div v-if="clusterNotFound">Cluster not found</div>
        <div v-else class="home">
          <slot></slot>
        </div>
      </div>
    </main>
  </div>
</template>
