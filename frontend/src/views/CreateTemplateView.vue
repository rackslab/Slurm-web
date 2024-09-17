<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ref } from 'vue'
import { PlusIcon, ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { JobTemplate } from '@/composables/GatewayAPI'
import { PermissionError } from '@/composables/HTTPErrors'
import UserDeveloperListbox from '@/components/jobs/UserDeveloperListbox.vue'
import InputsTable from '@/components/jobs/InputsTable.vue'

import { useTemplateStore } from '@/stores/template'
import UnsavedModal from '@/components/jobs/UnsavedModal.vue'
import { useAuthStore } from '@/stores/auth'

const templateStore = useTemplateStore()
const gateway = useGatewayAPI()
const authStore = useAuthStore()

const isNameValid = ref(true)
const isBatchScriptValid = ref(true)

const errorMessage = ref<string | undefined>()

async function createTemplate(author: string) {
  const newTemplate: JobTemplate = {
    name: templateStore.name,
    description: templateStore.description,
    userAccounts: templateStore.userAccounts,
    userLogins: templateStore.userLogins,
    developerAccounts: templateStore.developerAccounts,
    developerLogins: templateStore.developerLogins,
    inputs: templateStore.inputs,
    batchScript: templateStore.batchScript,
    author: author
  }
  try {
    await gateway.create_template(props.cluster, newTemplate)
    resetForm()
  } catch (error: any) {
    console.log(error)
    if (error instanceof PermissionError) {
      errorMessage.value = 'Permission denied'
    } else {
      errorMessage.value = `Unexpected error ${error}`
    }
  }
}

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
</script>

<template>
  <ClusterMainLayout
    :cluster="props.cluster"
    :breadcrumb="[
      { title: 'Jobs', routeName: 'jobs' },
      { title: 'Templates', routeName: 'templates' },
      { title: 'Create' }
    ]"
  >
    <button
      @click="templateStore.toggleUnsavedModal('template')"
      type="button"
      class="mb-16 ml-5 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
    >
      <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
      Back to templates
    </button>

    <div class="mt-8 flex flex-col items-center">
      <div class="ml-5 text-left">
        <p class="text-3xl font-bold tracking-tight text-gray-900">Create template</p>

        <p class="pt-10 text-right"><span class="text-slurmweb-red">*</span>required fields</p>

        <div class="flex items-center">
          <div class="w-[250px]">
            <label for="templateName" class="text-sm font-medium text-gray-900"
              >Name<span class="text-slurmweb-red">*</span></label
            >
            <p class="mt-1 text-sm text-gray-500">Name of the template</p>
          </div>
          <div class="relative mt-2 rounded-md">
            <input
              v-model="templateStore.name"
              @blur="isNameValid = templateStore.name.trim() !== ''"
              :class="{ 'border-red-500 ring-red-500': !isNameValid }"
              type="text"
              name="name"
              class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
              autofocus
            />
            <p v-if="!isNameValid" class="mt-1 text-sm text-red-500">Name is required</p>
          </div>
        </div>

        <div class="flex items-center pt-5">
          <div class="w-[250px]">
            <label for="templateDescription" class="text-sm font-medium text-gray-900"
              >Description</label
            >
            <p class="mt-1 text-sm text-gray-500">Long description of the template</p>
          </div>
          <div class="relative mt-2 rounded-md shadow-sm">
            <input
              v-model="templateStore.description"
              type="text"
              name="templateDescription"
              class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            />
          </div>
        </div>

        <hr class="my-5 border-gray-500" />

        <p class="text-sm font-medium text-gray-900">
          Users<span class="text-slurmweb-red">*</span>
        </p>
        <p class="mt-1 text-sm text-gray-500">Users who can use the template</p>

        <UserDeveloperListbox role="user" accountOrLogin="Accounts" :cluster="props.cluster" />
        <UserDeveloperListbox role="user" accountOrLogin="Logins" :cluster="props.cluster" />

        <hr class="my-5 border-gray-500" />

        <p class="text-sm font-medium text-gray-900">
          Developers<span class="text-slurmweb-red">*</span>
        </p>
        <p class="mt-1 text-sm text-gray-500">Developers who can edit the template</p>

        <UserDeveloperListbox role="developer" accountOrLogin="Accounts" :cluster="props.cluster" />
        <UserDeveloperListbox role="developer" accountOrLogin="Logins" :cluster="props.cluster" />

        <div class="pt-14">
          <InputsTable createOrEdit="create" />
          <router-link :to="{ name: 'create-input', params: { createOrEditInput: 'create' } }"
            ><button
              @click="templateStore.resetInput()"
              type="button"
              class="my-5 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
            >
              <PlusIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
              Add input
            </button></router-link
          >
        </div>

        <div class="flex flex-col pt-14">
          <div class="w-[250px]">
            <label for="scriptBatch" class="text-sm font-medium text-gray-900"
              >Batch script<span class="text-slurmweb-red">*</span></label
            >
            <p class="mt-1 text-sm text-gray-500">Script executed by the job</p>
          </div>
          <div class="relative mt-2 rounded-md">
            <textarea
              @blur="isBatchScriptValid = templateStore.batchScript.trim() !== ''"
              :class="{ 'border-red-500 ring-red-500': !isNameValid }"
              v-model="templateStore.batchScript"
              name="scriptBatch"
              cols="20"
              rows="10"
              class="block h-[150px] w-full rounded-md border-0 py-1.5 pr-20 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6"
            >
            </textarea>
            <p v-if="!isBatchScriptValid" class="mt-1 text-sm text-red-500">
              Batch Script is required
            </p>
          </div>

          <div class="flex justify-end">
            <button
              @click="templateStore.toggleUnsavedModal('template')"
              type="button"
              class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-gray-300 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
            >
              Cancel
            </button>

            <router-link :to="{ name: 'templates' }"
              ><button
                v-if="authStore.username"
                @click="createTemplate(authStore.username)"
                type="button"
                class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
              >
                Create
              </button></router-link
            >
          </div>
          <div>{{ errorMessage }}</div>
        </div>
      </div>
    </div>

    <DeleteInputModal v-if="templateStore.deleteIsClicked" />
    <UnsavedModal />
  </ClusterMainLayout>
</template>
