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
import router from '@/router'

export const useTemplateStore = defineStore('template', () => {
  const idTemplate: Ref<string> = ref('')
  const name: Ref<string> = ref('')
  const description: Ref<string> = ref('')
  const userAccounts: Ref<Array<string>> = ref([])
  const userLogins: Ref<Array<string>> = ref([])
  const developerAccounts: Ref<Array<string>> = ref([])
  const developerLogins: Ref<Array<string>> = ref([])
  const inputs: Ref<Array<Input>> = ref([])
  const batchScript: Ref<string> = ref('')
  const stagingInput: Ref<Input> = ref({
    id: '',
    name: '',
    description: '',
    default: '',
    minVal: '',
    maxVal: '',
    regex: '',
    type: ''
  })
  const toggleModal = ref(false)
  const formType = ref('')

  function resetTemplate() {
    idTemplate.value = ''
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
      id: '',
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
    inputs.value.push(stagingInput.value)
    resetInput()
  }

  function editInput(index: string) {
    inputs.value[Number(index)] = stagingInput.value
    resetInput()
  }

  function toggleUnsavedModal(form: string) {
    if (form == 'template') {
      if (
        name.value != '' ||
        description.value != '' ||
        batchScript.value != '' ||
        userAccounts.value.length! > 0 ||
        userLogins.value.length! > 0 ||
        developerAccounts.value.length! > 0 ||
        developerLogins.value.length! > 0 ||
        inputs.value.length! > 0
      ) {
        formType.value = form
        toggleModal.value = true
      } else {
        router.push({ name: 'templates' })
      }
    } else {
      if (
        stagingInput.value.name != '' ||
        stagingInput.value.description != '' ||
        stagingInput.value.type.length! > 0 ||
        stagingInput.value.default != '' ||
        stagingInput.value.minVal != '' ||
        stagingInput.value.maxVal != '' ||
        stagingInput.value.regex != ''
      ) {
        formType.value = form
        toggleModal.value = true
      } else {
        router.push({ name: 'create-template' })
      }
    }
  }

  function toggleDeleteModal(index: number, inputName: string) {
    stagingInput.value.name = inputName
    stagingInput.value.id = String(index)
    toggleModal.value = true
  }

  function toggleDeleteTemplateModal() {
    toggleModal.value = true
  }

  return {
    idTemplate,
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
    editInput,
    toggleModal,
    toggleUnsavedModal,
    toggleDeleteModal,
    toggleDeleteTemplateModal,
    formType
  }
})
