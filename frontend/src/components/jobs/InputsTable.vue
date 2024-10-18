<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { PencilIcon, TrashIcon } from '@heroicons/vue/20/solid'
import { useTemplateStore } from '@/stores/template'

const templateStore = useTemplateStore()

function updateStagingInput(
  name: string,
  description: string,
  type: string,
  default_value: string,
  regex: string,
  minVal: string,
  maxVal: string
) {
  templateStore.stagingInput.name = name
  templateStore.stagingInput.description = description
  templateStore.stagingInput.type = type
  templateStore.stagingInput.default_value = default_value

  if (type == 'string') {
    templateStore.stagingInput.regex = regex
  } else {
    templateStore.stagingInput.minVal = minVal
    templateStore.stagingInput.maxVal = maxVal
  }
}

const props = defineProps({
  createOrEdit: {
    type: String,
    required: true
  }
})
</script>

<template>
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
      <tr v-for="(input, index) in templateStore.inputs" :key="input.name">
        <td class="pt-4">{{ input.name }}</td>
        <td class="pt-4">
          <p>
            <span v-if="input.description != ''">{{ input.description }}</span>
            <span v-else>-</span>
          </p>
        </td>
        <td class="pt-4">
          <div v-if="input.type == '1' || input.type == 'float'">float</div>
          <div v-if="input.type == '2' || input.type == 'string'">string</div>
          <div v-if="input.type == '3' || input.type == 'int'">int</div>
        </td>
        <td class="pt-4">
          <p>
            <span v-if="input.default_value != ''">{{ input.default_value }}</span>
            <span v-else>-</span>
          </p>
        </td>
        <td class="pt-4">
          <div v-if="input.type == 'string'">
            <p>
              <span v-if="input.regex.length > 0">{{ input.regex }}</span>
              <span v-else>-</span>
            </p>
          </div>
          <div v-else>
            <p>
              <span v-if="input.minVal != '' && input.maxVal != ''">
                {{ input.minVal }} ≤ n ≥ {{ input.maxVal }}
              </span>
              <span v-else>-</span>
            </p>
          </div>
        </td>
        <td class="pt-4">
          <div class="flex space-x-2">
            <button
              @click="templateStore.toggleDeleteModal('input', index, input.name)"
              class="flex items-center justify-center rounded-md bg-slurmweb-red p-2 text-white hover:bg-slurmweb-darkred focus:outline-none focus:ring-2 focus:ring-slurmweb-red"
            >
              <TrashIcon class="h-5 w-5" />
            </button>

            <router-link
              :to="{
                name: 'edit-input',
                params: { indexInput: index, createOrEditInput: props.createOrEdit }
              }"
            >
              <button
                class="flex items-center justify-center rounded-md bg-slurmweb p-2 text-white hover:bg-slurmweb-dark focus:outline-none focus:ring-2 focus:ring-blue-300"
                @click="
                  updateStagingInput(
                    input.name,
                    input.description,
                    input.type,
                    input.default_value,
                    input.regex,
                    input.minVal,
                    input.maxVal
                  )
                "
              >
                <PencilIcon class="h-5 w-5" /></button
            ></router-link>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
