<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'

const router = useRouter()
const authStore = useAuthStore()
const runtimeStore = useRuntimeStore()
const gateway = useGatewayAPI()

onMounted(async () => {
  /* After the gateway OIDC callback, the browser lands here with a Flask
   * session cookie but no JWT yet. Exchange that cookie for handoff data via
   * oidcSession(), then authStore.login() persists the JWT and redirects away
   * (router.push to returnUrl or clusters — not handled in this view).
   *
   * On failure, report the error and send the user to login so they are not
   * stuck on this page and can start OpenID sign-in again. */
  try {
    const response = await gateway.oidcSession()
    authStore.login(response.token, response.login, response.fullname, response.groups)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      runtimeStore.reportError(`Authentication error: ${error.message}`)
    } else if (error instanceof Error) {
      runtimeStore.reportError(`Other error: ${error.message}`)
    }
    await router.replace({ name: 'login' })
  }
})
</script>

<template>
  <main>
    <section class="bg-slurmweb-light dark:bg-gray-900">
      <div class="mx-auto flex h-screen flex-col items-center justify-center px-6 py-4">
        <p class="text-gray-900 dark:text-white">Completing sign in…</p>
      </div>
    </section>
  </main>
</template>
