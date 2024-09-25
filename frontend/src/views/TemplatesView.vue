<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ChevronLeftIcon, PencilIcon } from '@heroicons/vue/20/solid'
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
import type { Template } from '@/composables/GatewayAPI'
import { useAuthStore } from '@/stores/auth'

import { useClusterDataGetter } from '@/composables/DataGetter'
import { useTemplateStore } from '@/stores/template'

const templateStore = useTemplateStore()
const authStore = useAuthStore()

function resetForm() {
  templateStore.resetTemplate()
  templateStore.resetInput()
}

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const templates = useClusterDataGetter<Template[]>('templates', props.cluster)
</script>

<template>
  <ClusterMainLayout
    :cluster="props.cluster"
    :breadcrumb="[{ title: 'Jobs', routeName: 'jobs' }, { title: 'Templates' }]"
  >
    <router-link :to="{ name: 'jobs' }"
      ><button
        type="button"
        id="backBtn"
        class="mb-16 ml-5 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
      >
        <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
        Back to jobs
      </button></router-link
    >

    <div class="mt-8 flex flex-col items-center">
      <div class="ml-5 text-left">
        <p id="title" class="text-3xl font-bold tracking-tight text-gray-900">Templates</p>
        <p id="description" class="mt-4 max-w-xl text-sm font-light text-gray-600">
          Edit or create jobs templates
        </p>

        <div class="mt-8 flex flex-wrap justify-center gap-6">
          <div
            v-for="template in templates.data.value"
            :key="template.id"
            @click="resetForm()"
            class="flex flex-col rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800 sm:w-[400px] md:w-[400px] lg:w-[400px]"
          >
            <div class="m-10">
              <div class="flex h-fit">
                <h3 class="text-sm font-medium text-gray-900">{{ template.name }}</h3>
                <span
                  v-if="template.author == authStore.username"
                  class="ml-2 items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                  >Author</span
                >
              </div>
              <p class="mt-5 text-sm text-gray-500">{{ template.description }}</p>
            </div>
            <div class="flex-grow"></div>

            <div class="w-full border-t border-gray-200 dark:border-gray-700">
              <router-link :to="{ name: 'edit-template', params: { idTemplate: template.id } }">
                <button
                  class="flex w-full items-center justify-center rounded-b-lg py-3 font-medium transition duration-200 ease-in-out hover:bg-slurmweb hover:text-white dark:bg-gray-700"
                >
                  <PencilIcon class="mr-2 h-4 w-5" />
                  Edit
                </button></router-link
              >
            </div>
          </div>
          <div class="flex items-center">
            <router-link :to="{ name: 'create-template' }">
              <button
                @click="resetForm()"
                type="button"
                id="create"
                class="relative flex w-full flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-slurmweb focus:ring-offset-2 sm:w-[400px] md:w-[400px] lg:w-[400px]"
              >
                <PlusCircleIcon class="h-14 w-14 text-slurmweb" />
                <span class="mt-2 block text-sm font-medium text-gray-900"
                  >Create new template</span
                >
              </button></router-link
            >
          </div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
