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
    default_value: '',
    minVal: '',
    maxVal: '',
    regex: '',
    type: ''
  })
  const toggleModal = ref(false)
  const formType = ref('')
  const unsavedIsclicked = ref(false)
  const deleteIsClicked = ref(false)
  const showNameError = ref(false)
  const showBatchScriptError = ref(false)
  const showUserAccountsError = ref(false)
  const showUserLoginsError = ref(false)
  const showDeveloperAccountsError = ref(false)
  const showDeveloperLoginsError = ref(false)
  const showError = ref(false)
  const showInputNameError = ref(false)
  const showInputTypeError = ref(false)

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
      default_value: '',
      minVal: '',
      maxVal: '',
      regex: '',
      type: ''
    }
    showInputNameError.value = false
    showInputTypeError.value = false
  }

  function addInput(formType: string) {
    if (stagingInput.value.name == '' || stagingInput.value.type == '') {
      if (stagingInput.value.name == '') {
        showInputNameError.value = true
      }

      if (stagingInput.value.type == '') {
        showInputTypeError.value = true
      }
    } else {
      inputs.value.push(stagingInput.value)
      if (formType == 'edit') {
        console.log(inputs.value)
        router.push({
          name: 'edit-template',
          params: { idTemplate: idTemplate.value }
        })
      } else {
        console.log(inputs.value)
        router.push({ name: 'create-template' })
      }

      resetInput()
    }
  }

  function editInput(index: string, type: string) {
    if (stagingInput.value.name == '' || stagingInput.value.type == '') {
      if (stagingInput.value.name == '') {
        showInputNameError.value = true
      }

      if (stagingInput.value.type == '') {
        showInputTypeError.value = true
      }
    } else {
      inputs.value[Number(index)] = stagingInput.value
      if (type == 'edit') {
        router.push({
          name: 'edit-template',
          params: { idTemplate: idTemplate.value }
        })
      } else {
        router.push({ name: 'create-template' })
      }
      resetInput()
    }
  }

  function toggleUnsavedModal(form: string) {
    unsavedIsclicked.value = true
    deleteIsClicked.value = false
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
        stagingInput.value.default_value != '' ||
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

  function toggleDeleteModal(form: string, inputIndex?: number, inputName?: string) {
    unsavedIsclicked.value = false
    deleteIsClicked.value = true
    if (form == 'template') {
      formType.value = form
      toggleModal.value = true
    } else {
      stagingInput.value.name = inputName!
      stagingInput.value.id = String(inputIndex)
      formType.value = form
      toggleModal.value = true
    }
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
    toggleModal,
    formType,
    deleteIsClicked,
    unsavedIsclicked,
    showNameError,
    showBatchScriptError,
    showUserAccountsError,
    showUserLoginsError,
    showDeveloperAccountsError,
    showDeveloperLoginsError,
    showError,
    showInputNameError,
    showInputTypeError,
    resetTemplate,
    resetInput,
    addInput,
    editInput,
    toggleUnsavedModal,
    toggleDeleteModal
  }
})
