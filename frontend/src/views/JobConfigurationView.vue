<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { onMounted, ref } from 'vue'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { Ref } from 'vue'
import type { Input } from '@/composables/GatewayAPI'

const gateway = useGatewayAPI()
const selectedTemplate: Ref<Record<string, string>> = ref({})
const inputs: Ref<Array<Input>> = ref([])

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
  let getTemplates = await gateway.templates(props.cluster)
  let getInputs = await gateway.inputs(props.cluster)

  getTemplates.forEach((template) => {
    if (template.id == Number(props.idTemplate)) {
      selectedTemplate.value['name'] = template.name
      selectedTemplate.value['description'] = template.description
    }
  })
  inputs.value = getInputs.filter((input) => input.template == Number(props.idTemplate))
})
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="Job configuration">
    <router-link :to="{ name: 'submit-new-job' }"
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
        <p class="text-3xl font-bold tracking-tight text-gray-900">{{ selectedTemplate.name }}</p>
        <p class="mt-4 max-w-xl text-sm font-light text-gray-600">
          {{ selectedTemplate.description }}
        </p>

        <div v-for="input in inputs" :key="input.id" class="flex items-center pt-10">
          <div class="w-52 flex-col text-left">
            <p class="text-sm font-medium text-gray-900">{{ input.name }}</p>
            <p class="mt-1 text-sm text-gray-500">{{ input.description }}</p>
          </div>
          <input
            type="text"
            class="border-1 ml-5 w-96 rounded-md border-solid bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:border-slurmweb focus:outline-none sm:text-sm sm:leading-6"
            required
          />
          <p class="mt-1 pl-5 text-sm text-gray-500">{{ input.default }}</p>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            class="text-blck mb-16 mt-8 inline-flex w-20 justify-center gap-x-2 rounded-md bg-gray-200 px-3.5 py-2.5 text-sm font-semibold shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            class="mb-16 ml-5 mt-8 inline-flex w-20 justify-center gap-x-2 rounded-md bg-slurmweb px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slurmweb-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slurmweb-dark"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
