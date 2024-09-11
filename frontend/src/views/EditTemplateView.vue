<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ref, onMounted } from 'vue'
import { PlusIcon, ChevronLeftIcon, TrashIcon } from '@heroicons/vue/20/solid'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { PermissionError } from '@/composables/HTTPErrors'
import { useTemplateStore } from '@/stores/template'
import UserDeveloperListbox from '@/components/jobs/UserDeveloperListbox.vue'
import InputsTable from '@/components/jobs/InputsTable.vue'
import router from '@/router'
import type { JobTemplate } from '@/composables/GatewayAPI'

const templateStore = useTemplateStore()
const gateway = useGatewayAPI()

const errorMessage = ref<string | undefined>()

async function editTemplate() {
  const editTemplate: JobTemplate = {
    idTemplate: Number(props.idTemplate),
    name: templateStore.name,
    description: templateStore.description,
    userAccounts: templateStore.userAccounts,
    userLogins: templateStore.userLogins,
    developerAccounts: templateStore.developerAccounts,
    developerLogins: templateStore.developerLogins,
    inputs: templateStore.inputs,
    batchScript: templateStore.batchScript
  }
  try {
    await gateway.edit_template(props.cluster, editTemplate)
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

function deleteTemplate() {
  try {
    gateway.delete_template(props.cluster, Number(props.idTemplate))
    router.push({ name: 'templates' })
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
  },
  idTemplate: {
    type: String,
    required: true
  }
})

onMounted(async () => {
  let templateData = await gateway.get_template_data(props.cluster, Number(props.idTemplate))

  templateStore.idTemplate = String(templateData.template.id)
  templateStore.name = templateData.template.name
  templateStore.description = templateData.template.description
  templateStore.batchScript = templateData.template.batchScript

  templateStore.userAccounts = templateData.userAccounts
  templateStore.userLogins = templateData.userLogins
  templateStore.developerAccounts = templateData.developerAccounts
  templateStore.developerLogins = templateData.developerLogins
  templateStore.inputs = templateData.inputs
})
</script>

<template>
  <ClusterMainLayout
    :cluster="props.cluster"
    :breadcrumb="[
      { title: 'Jobs', routeName: 'jobs' },
      { title: 'Templates', routeName: 'templates' },
      { title: 'Edit' }
    ]"
  >
    <div class="mt-8 flex items-center justify-between">
      <router-link :to="{ name: 'templates' }">
        <button
          @click="resetForm()"
          type="button"
          class="mb-16 ml-5 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
        >
          <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Back to templates
        </button>
      </router-link>

      <button
        @click="deleteTemplate()"
        type="button"
        class="mb-16 mr-5 mt-8 inline-flex items-center gap-x-2 rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        <TrashIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
        Delete template
      </button>
    </div>

    <div class="mt-8 flex flex-col items-center">
      <div class="ml-5 text-left">
        <p class="text-3xl font-bold tracking-tight text-gray-900">Edit template</p>

        <p class="pt-10 text-right"><span class="text-slurmweb-red">*</span>required fields</p>

        <div class="flex items-center">
          <div class="w-[250px]">
            <label for="templateName" class="text-sm font-medium text-gray-900"
              >Name<span class="text-slurmweb-red">*</span></label
            >
            <p class="mt-1 text-sm text-gray-500">Name of the template</p>
          </div>
          <div class="relative mt-2 rounded-md shadow-sm">
            <input
              v-model="templateStore.name"
              type="text"
              name="templateName"
              class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            />
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
          <InputsTable />
          <router-link :to="{ name: 'create-input', params: { createOrEditInput: 'edit' } }"
            ><button
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
          <div class="relative mt-2 rounded-md shadow-sm">
            <textarea
              v-model="templateStore.batchScript"
              name="scriptBatch"
              cols="20"
              rows="10"
              class="block h-[150px] w-full rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6"
            >
            </textarea>
          </div>

          <div class="flex justify-end">
            <router-link :to="{ name: 'templates' }"
              ><button
                @click="resetForm()"
                type="button"
                class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-gray-300 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
              >
                Cancel
              </button></router-link
            >

            <router-link :to="{ name: 'templates' }"
              ><button
                @click="editTemplate()"
                type="button"
                class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
              >
                Save
              </button></router-link
            >
          </div>
          <div>{{ errorMessage }}</div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
