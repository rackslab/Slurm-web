<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ChevronLeftIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  RadioGroup,
  RadioGroupOption
} from '@headlessui/vue'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { ref, onMounted } from 'vue'
import type { InputType } from '@/composables/GatewayAPI'
import type { Ref } from 'vue'

const selectedType = ref()
const gateway = useGatewayAPI()
const input_types: Ref<Array<InputType>> = ref([])
const constraint = ref('regex')

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

onMounted(async () => {
  input_types.value = await gateway.input_types(props.cluster)
})
</script>

<template>
  <ClusterMainLayout
    :cluster="props.cluster"
    :breadcrumb="[
      { title: 'Jobs', routeName: 'jobs' },
      { title: 'Templates', routeName: 'templates' },
      { title: 'Create', routeName: 'create-template' },
      { title: 'Create input' }
    ]"
  >
    <router-link :to="{ name: 'jobs' }"
      ><button
        type="button"
        class="mb-16 ml-5 mt-8 inline-flex items-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
      >
        <ChevronLeftIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
        Back to template
      </button></router-link
    >

    <div class="mt-8 flex flex-col items-center">
      <div class="ml-5 text-left">
        <p class="text-3xl font-bold tracking-tight text-gray-900">Create input</p>

        <p class="pt-10 text-right"><span class="text-slurmweb-red">*</span>required fields</p>

        <!-- form -->
        <div class="flex items-center">
          <div class="w-[250px]">
            <label for="name" class="text-sm font-medium text-gray-900"
              >Name<span class="text-slurmweb-red">*</span></label
            >
            <p class="mt-1 text-sm text-gray-500">Name of the input</p>
          </div>
          <div class="relative mt-2 rounded-md shadow-sm">
            <input
              type="text"
              name="name"
              id="name"
              class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            />
          </div>
        </div>

        <div class="flex items-center pt-5">
          <div class="w-[250px]">
            <label for="description" class="text-sm font-medium text-gray-900">Description</label>
            <p class="mt-1 text-sm text-gray-500">Long description of the input</p>
          </div>
          <div class="relative mt-2 rounded-md shadow-sm">
            <input
              type="text"
              name="name"
              id="name"
              class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            />
          </div>
        </div>

        <!-- user accounts -->
        <Listbox as="div" v-model="selectedType" class="flex pt-5">
          <div class="w-[250px]">
            <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900"
              >Types<span class="text-slurmweb-red">*</span></ListboxLabel
            >
            <p class="mt-1 text-sm text-gray-500">Select the type of the input</p>
          </div>
          <div class="relative mt-2">
            <ListboxButton
              class="relative h-[35px] w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            >
              <span class="flex items-center">
                <span class="block truncate">{{ selectedType }}</span>
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
                  v-for="input_type in input_types"
                  :key="input_type.id"
                  :value="input_type.name"
                  v-slot="{ active, selected }"
                >
                  <li
                    :class="[
                      active ? 'bg-slurmweb text-white' : 'text-gray-900',
                      'relative cursor-default select-none py-2 pl-3 pr-9'
                    ]"
                  >
                    <div class="flex items-center">
                      <span
                        :class="[selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate']"
                        >{{ input_type.name }}</span
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

        <div class="flex items-center pt-5">
          <div class="w-[250px]">
            <label for="description" class="text-sm font-medium text-gray-900">Default</label>
            <p class="mt-1 text-sm text-gray-500">Default value to the input</p>
          </div>
          <div class="relative mt-2 rounded-md shadow-sm">
            <input
              type="text"
              name="name"
              id="name"
              class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
            />
          </div>
        </div>

        <!--If it's a string-->
        <!--Constraint-->
        <div v-if="selectedType == 'string'">
          <div class="mt-5 flex items-center">
            <div class="w-[250px]">
              <label for="constraint" class="text-sm font-medium text-gray-900">Constraint</label>
              <p class="mt-1 text-sm text-gray-500">Define constraint for the value</p>
            </div>
            <div class="relative mt-2 rounded-md shadow-sm">
              <input
                type="text"
                name="constraint"
                id="constraint"
                class="block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
              />
            </div>
          </div>
          <RadioGroup v-model="constraint" class="mt-5 pl-[250px]">
            <div class="mt-2 flex space-x-6">
              <RadioGroupOption v-slot="{ checked }" value="regex" class="flex items-center">
                <input type="radio" :checked="checked" class="form-radio text-slurmweb" />
                <span :class="[checked ? 'text-slurmweb' : 'text-gray-900', 'ml-2']">Regex</span>
              </RadioGroupOption>
              <RadioGroupOption v-slot="{ checked }" value="none" class="flex items-center">
                <input type="radio" :checked="checked" class="form-radio text-slurmweb" />
                <span :class="[checked ? 'text-slurmweb' : 'text-gray-900', 'ml-2']">None</span>
              </RadioGroupOption>
            </div>
          </RadioGroup>

          <input
            type="text"
            name="constraint"
            id="constraint"
            class="ml-[250px] mt-5 block h-[35px] rounded-md border-0 py-1.5 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
          />
        </div>

        <!--buttons-->
        <div class="flex justify-end">
          <router-link :to="{ name: 'create-template' }"
            ><button
              type="button"
              class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-gray-300 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
            >
              Cancel
            </button></router-link
          >

          <router-link :to="{ name: 'create-template' }"
            ><button
              type="button"
              class="mb-16 ml-5 mt-8 inline-flex w-24 justify-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
            >
              Add
            </button></router-link
          >
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
