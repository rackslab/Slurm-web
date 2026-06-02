/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function useAuthSession() {
  const authStore = useAuthStore()
  const router = useRouter()

  async function login(token: string, username: string, fullname: string, groups: string[]) {
    authStore.setSession(token, username, fullname, groups)
    return router.push(authStore.takePostLoginRoute())
  }

  async function anonymousLogin(token: string) {
    return login(token, 'anonymous', 'anonymous', [])
  }

  return { login, anonymousLogin }
}
