<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ref, onMounted } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon, PlusIcon, ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { UserDescription, AccountDescription, CreateTemplate } from '@/composables/GatewayAPI'
import type { Ref } from 'vue'
import { useTemplateStore } from '@/stores/forms/createTemplate'
import { useInputStore } from '@/stores/forms/createInput'

const templateStore = useTemplateStore()
const inputStore = useInputStore()
const gateway = useGatewayAPI()

const accounts: Ref<Array<AccountDescription>> = ref([])
const logins: Ref<Array<UserDescription>> = ref([])

const selectedUserAccounts = ref([])
const selectedUserLogins = ref([])
const selectedDeveloperAccounts = ref([])
const selectedDeveloperLogins = ref([])

const nameTemplate = ref('')
const descriptionTemplate = ref('')
const scriptBatchTemplate = ref('')

function createTemplate() {
  const newTemplate: CreateTemplate = {
    name: nameTemplate.value,
    description: descriptionTemplate.value,
    userAccounts: selectedUserAccounts.value,
    userLogins: selectedUserLogins.value,
    developerAccounts: selectedDeveloperAccounts.value,
    developerLogins: selectedDeveloperLogins.value,
    scriptBatch: scriptBatchTemplate.value
  }
  gateway.create_template(props.cluster, newTemplate)
}

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

onMounted(async () => {
  accounts.value = await gateway.accounts(props.cluster)
  logins.value = await gateway.users()
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
    <router-link :to="{ name: 'templates' }"
      ><button
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

        <Listbox as="div" v-model="selectedUserAccounts" class="flex pt-5" multiple>
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
                  selectedUserAccounts.map((userAccount) => `@${userAccount}`).join(', ')
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
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="account in accounts"
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

        <Listbox as="div" v-model="selectedUserLogins" class="flex pt-5" multiple>
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
                  selectedUserLogins.map((userLogin) => userLogin).join(', ')
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
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="userLogin in logins"
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

        <Listbox as="div" v-model="selectedDeveloperAccounts" class="flex pt-5" multiple>
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
                  selectedDeveloperAccounts
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
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="developerAccount in accounts"
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

        <Listbox as="div" v-model="selectedDeveloperLogins" class="flex pt-5" multiple>
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
                  selectedDeveloperLogins.map((developerLogin) => developerLogin).join(', ')
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
                class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                <ListboxOption
                  as="template"
                  v-for="developerLogin in logins"
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
          <table class="w-full text-center" v-if="inputStore.inputs.length > 0">
            <thead class="border-b border-gray-500">
              <tr>
                <th class="pb-3">Input name<span class="text-slurmweb-red">*</span></th>
                <th class="pb-3">Description</th>
                <th class="pb-3">Type<span class="text-slurmweb-red">*</span></th>
                <th class="pb-3">Default</th>
                <th class="pb-3">Constraint</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="input in inputStore.inputs" :key="input.name">
                <th>{{ input.name }}</th>
                <td>{{ input.description }}</td>
                <td>{{ input.type }}</td>
                <td>{{ input.default }}</td>
                <td>
                  <div v-if="input.type == 'string'">
                    <p>{{ input.regex }}</p>
                  </div>
                  <div v-else>
                    <p>{{ input.minVal }} ≤ n ≥ {{ input.maxVal }}</p>
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
              v-model="scriptBatchTemplate"
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
                @click="templateStore.resetTemplate()"
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
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
