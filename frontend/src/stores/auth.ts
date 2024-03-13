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
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  const token: Ref<string | null> = ref(localStorage.getItem('token'))
  const username: Ref<string | null> = ref(localStorage.getItem('username'))
  const fullname: Ref<string | null> = ref(localStorage.getItem('fullname'))
  const groups: Ref<Array<string> | null> = ref(
    JSON.parse(localStorage.getItem('groups') || '[]') as string[]
  )
  const returnUrl: Ref<string | null> = ref(null)

  function login(_token: string, _username: string, _fullname: string, _groups: string[]) {
    // update pinia state
    token.value = _token
    username.value = _username
    fullname.value = _fullname
    groups.value = _groups

    // store user details and jwt in local storage to keep user logged in between page refreshes
    localStorage.setItem('token', _token)
    localStorage.setItem('username', _username)
    localStorage.setItem('fullname', _fullname)
    localStorage.setItem('groups', JSON.stringify(_groups))

    // redirect to previous url or default to clusters page
    router.push(returnUrl.value || { name: 'clusters' })
  }

  function anonymousLogin(_token: string) {
    login(_token, 'anonymous', 'anonymous', [])
  }

  function logout() {
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('fullname')
    localStorage.removeItem('groups')
    router.push({ name: 'login' })
  }

  return { token, username, fullname, groups, returnUrl, login, anonymousLogin, logout }
})
