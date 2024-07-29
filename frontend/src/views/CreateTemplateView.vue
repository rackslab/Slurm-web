<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ref } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue'
import {
  CheckIcon,
  ChevronUpDownIcon,
  PlusIcon,
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/vue/20/solid'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { UserDescription, AccountDescription, CreateTemplate } from '@/composables/GatewayAPI'
import { useClusterDataGetter, useGatewayDataGetter } from '@/composables/DataGetter'
import { PermissionError } from '@/composables/HTTPErrors'

import { useTemplateStore } from '@/stores/template'

const templateStore = useTemplateStore()
const gateway = useGatewayAPI()

const errorMessage = ref<string | undefined>()

async function createTemplate() {
  const newTemplate: CreateTemplate = {
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
    await gateway.create_template(props.cluster, newTemplate)
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

const accounts = useClusterDataGetter<AccountDescription[]>('accounts', props.cluster)
const logins = useGatewayDataGetter<UserDescription[]>('users')
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
    <router-link :to="{ name: 'templates' }"
      ><button
        @click="resetForm()"
        type="button"
        class="mb-16 ml-5 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
      >
        <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
        Back to templates
      </button></router-link
    >

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

        <Listbox as="div" v-model="templateStore.userAccounts" class="flex pt-5" multiple>
          <div class="w-[250px]">
            <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900"
              >Accounts</ListboxLabel
            >
            <p class="mt-1 text-sm text-gray-500">Select users by account</p>
          </div>
          <div class="relative mt-2">
            <ListboxButton
              class="relative h-[35px] w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            >
              <span class="flex items-center">
                <span class="block truncate">{{
                  templateStore.userAccounts.map((userAccount) => `@${userAccount}`).join(', ')
                }}</span>
              </span>
              <span
                class="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2"
              >
                <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>

            <transition
              leave-active-class="transition ease-in duration-100"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions
                v-if="accounts.data"
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="account in accounts.data.value"
                  :key="account.name"
                  :value="account.name"
                  v-slot="{ active, selected }"
                >
                  <li
                    :class="[
                      active ? 'bg-slurmweb text-white' : 'text-gray-900',
                      'relative cursor-default select-none py-2 pl-3 pr-9'
                    ]"
                  >
                    <div class="flex items-center">
                      <span :class="['truncate', selected && 'font-semibold']"
                        >@{{ account.name }}</span
                      >
                    </div>

                    <span
                      v-if="selected"
                      :class="[
                        active ? 'text-white' : 'text-slurmweb',
                        'absolute inset-y-0 right-0 flex items-center pr-4'
                      ]"
                    >
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>

        <Listbox as="div" v-model="templateStore.userLogins" class="flex pt-5" multiple>
          <div class="w-[250px]">
            <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900"
              >Logins</ListboxLabel
            >
            <p class="mt-1 text-sm text-gray-500">Select users by login or name</p>
          </div>
          <div class="relative mt-2">
            <ListboxButton
              class="relative h-[35px] w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            >
              <span class="flex items-center">
                <span class="block truncate">{{
                  templateStore.userLogins.map((userLogin) => `${userLogin}`).join(', ')
                }}</span>
              </span>
              <span
                class="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2"
              >
                <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>

            <transition
              leave-active-class="transition ease-in duration-100"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions
                v-if="logins.data"
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="userLogin in logins.data.value"
                  :key="userLogin.login"
                  :value="userLogin.login"
                  v-slot="{ active, selected }"
                >
                  <li
                    :class="[
                      active ? 'bg-slurmweb text-white' : 'text-gray-900',
                      'relative cursor-default select-none py-2 pl-3 pr-9'
                    ]"
                  >
                    <div class="flex">
                      <span :class="['truncate', selected && 'font-semibold']">
                        {{ userLogin.fullname }}
                      </span>
                      <span
                        :class="[
                          'ml-2 truncate text-gray-500',
                          active ? 'text-indigo-200' : 'text-gray-500'
                        ]"
                      >
                        {{ userLogin.login }}
                      </span>
                    </div>

                    <span
                      v-if="selected"
                      :class="[
                        active ? 'text-white' : 'text-indigo-600',
                        'absolute inset-y-0 right-0 flex items-center pr-4'
                      ]"
                    >
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>

        <hr class="my-5 border-gray-500" />

        <p class="text-sm font-medium text-gray-900">
          Developers<span class="text-slurmweb-red">*</span>
        </p>
        <p class="mt-1 text-sm text-gray-500">Developers who can edit the template</p>

        <Listbox as="div" v-model="templateStore.developerAccounts" class="flex pt-5" multiple>
          <div class="w-[250px]">
            <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900"
              >Accounts</ListboxLabel
            >
            <p class="mt-1 text-sm text-gray-500">Select developers by account</p>
          </div>
          <div class="relative mt-2">
            <ListboxButton
              class="relative h-[35px] w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            >
              <span class="flex items-center">
                <span class="block truncate">{{
                  templateStore.developerAccounts
                    .map((developerAccount) => `@${developerAccount}`)
                    .join(', ')
                }}</span>
              </span>
              <span
                class="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2"
              >
                <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>

            <transition
              leave-active-class="transition ease-in duration-100"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions
                v-if="accounts.data"
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="developerAccount in accounts.data.value"
                  :key="developerAccount.name"
                  :value="developerAccount.name"
                  v-slot="{ active, selected }"
                >
                  <li
                    :class="[
                      active ? 'bg-slurmweb text-white' : 'text-gray-900',
                      'relative cursor-default select-none py-2 pl-3 pr-9'
                    ]"
                  >
                    <div class="flex">
                      <span :class="['truncate', selected && 'font-semibold']"
                        >@{{ developerAccount.name }}</span
                      >
                    </div>

                    <span
                      v-if="selected"
                      :class="[
                        active ? 'text-white' : 'text-indigo-600',
                        'absolute inset-y-0 right-0 flex items-center pr-4'
                      ]"
                    >
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>

        <Listbox as="div" v-model="templateStore.developerLogins" class="flex pt-5" multiple>
          <div class="w-[250px]">
            <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900"
              >Logins</ListboxLabel
            >
            <p class="mt-1 text-sm text-gray-500">Select developers by login or name</p>
          </div>
          <div class="relative mt-2">
            <ListboxButton
              class="relative h-[35px] w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            >
              <span class="flex items-center">
                <span class="block truncate">{{
                  templateStore.developerLogins
                    .map((developerLogin) => `${developerLogin}`)
                    .join(', ')
                }}</span>
              </span>
              <span
                class="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2"
              >
                <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>

            <transition
              leave-active-class="transition ease-in duration-100"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions
                v-if="logins.data"
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="developerLogin in logins.data.value"
                  :key="developerLogin.login"
                  :value="developerLogin.login"
                  v-slot="{ active, selected }"
                >
                  <li
                    :class="[
                      active ? 'bg-slurmweb text-white' : 'text-gray-900',
                      'relative cursor-default select-none py-2 pl-3 pr-9'
                    ]"
                  >
                    <div class="flex">
                      <span :class="['truncate', selected && 'font-semibold']">
                        {{ developerLogin.fullname }}
                      </span>
                      <span
                        :class="[
                          'ml-2 truncate text-gray-500',
                          active ? 'text-indigo-200' : 'text-gray-500'
                        ]"
                      >
                        {{ developerLogin.login }}
                      </span>
                    </div>

                    <span
                      v-if="selected"
                      :class="[
                        active ? 'text-white' : 'text-indigo-600',
                        'absolute inset-y-0 right-0 flex items-center pr-4'
                      ]"
                    >
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>

        <div class="pt-14">
          <table class="w-full text-center" v-if="templateStore.inputs.length > 0">
            <thead class="border-b border-gray-500">
              <tr>
                <th class="pb-4">Input name<span class="text-slurmweb-red">*</span></th>
                <th class="pb-4">Description</th>
                <th class="pb-4">Type<span class="text-slurmweb-red">*</span></th>
                <th class="pb-4">Default</th>
                <th class="pb-4">Constraint</th>
                <th class="pb-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="input in templateStore.inputs" :key="input.name">
                <td class="pt-4">{{ input.name }}</td>
                <td class="pt-4">{{ input.description }}</td>
                <td class="pt-4">{{ input.type }}</td>
                <td class="pt-4">{{ input.default }}</td>
                <td class="pt-4">
                  <div v-if="input.type == 2">
                    <p>
                      <span v-if="input.regex.length > 0">{{ input.regex }}</span>
                      <span v-else>-</span>
                    </p>
                  </div>
                  <div v-else>
                    <p>
                      <span v-if="input.minVal != 0 && input.maxVal != 0">
                        {{ input.minVal }} ≤ n ≥ {{ input.maxVal }}
                      </span>
                      <span v-else>-</span>
                    </p>
                  </div>
                </td>
                <td class="pt-4">
                  <div class="flex space-x-2">
                    <button
                      class="flex items-center justify-center rounded-md bg-slurmweb-red p-2 text-white hover:bg-slurmweb-darkred focus:outline-none focus:ring-2 focus:ring-slurmweb-red"
                    >
                      <TrashIcon class="h-5 w-5" />
                    </button>

                    <button
                      class="flex items-center justify-center rounded-md bg-slurmweb p-2 text-white hover:bg-slurmweb-dark focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <PencilIcon class="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <router-link :to="{ name: 'create-input' }"
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

            <button
              @click="createTemplate()"
              type="button"
              class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
            >
              Create
            </button>
          </div>
          <div>{{ errorMessage }}</div>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
