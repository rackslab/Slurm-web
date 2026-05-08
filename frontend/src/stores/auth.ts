/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  const token: Ref<string | null> = ref(null)
  const username: Ref<string | null> = ref(null)
  const fullname: Ref<string | null> = ref(null)
  const groups: Ref<Array<string> | null> = ref([])
  const returnUrl: Ref<string | null> = ref(null)

  function login(_token: string, _username: string, _fullname: string, _groups: string[]) {
    // update pinia state
    token.value = _token
    username.value = _username
    fullname.value = _fullname
    groups.value = _groups

    // redirect to previous url or default to clusters page
    const redirectUrl = returnUrl.value || { name: 'clusters' }
    returnUrl.value = null // Clear returnUrl after use
    router.push(redirectUrl)
  }

  function anonymousLogin(_token: string) {
    login(_token, 'anonymous', 'anonymous', [])
  }

  function logout() {
    token.value = null
    username.value = null
    fullname.value = null
    groups.value = []
  }

  return { token, username, fullname, groups, returnUrl, login, anonymousLogin, logout }
})
