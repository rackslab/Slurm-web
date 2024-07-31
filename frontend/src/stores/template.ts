/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Input } from '@/composables/GatewayAPI'

export const useTemplateStore = defineStore('template', () => {
  const name: Ref<string> = ref('')
  const description: Ref<string> = ref('')
  const userAccounts: Ref<Array<string>> = ref([])
  const userLogins: Ref<Array<string>> = ref([])
  const developerAccounts: Ref<Array<string>> = ref([])
  const developerLogins: Ref<Array<string>> = ref([])
  const inputs: Ref<Array<Input>> = ref([])
  const batchScript: Ref<string> = ref('')
  const stagingInput: Ref<Input> = ref({
    name: '',
    description: '',
    default: '',
    minVal: '',
    maxVal: '',
    regex: '',
    type: ''
  })

  function resetTemplate() {
    name.value = ''
    description.value = ''
    batchScript.value = ''
    userAccounts.value = []
    userLogins.value = []
    developerAccounts.value = []
    developerLogins.value = []
    inputs.value = []
  }

  function resetInput() {
    stagingInput.value = {
      name: '',
      description: '',
      default: '',
      minVal: '',
      maxVal: '',
      regex: '',
      type: ''
    }
  }

  function addInput() {
    if (stagingInput.value) {
      inputs.value.push(stagingInput.value)
      resetInput()
    }
  }

  function editInput(index: string) {
    if (stagingInput.value) {
      inputs.value[Number(index)] = stagingInput.value
      resetInput()
    }
  }

  return {
    name,
    description,
    userAccounts,
    userLogins,
    developerAccounts,
    developerLogins,
    inputs,
    batchScript,
    stagingInput,
    resetTemplate,
    resetInput,
    addInput,
    editInput
  }
})
