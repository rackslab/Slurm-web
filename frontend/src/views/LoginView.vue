<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'
import LoginServiceMessage from '@/components/login/LoginServiceMessage.vue'

const gateway = useGatewayAPI()

const username: Ref<string | null> = ref(null)
const password: Ref<string | null> = ref(null)
const disableSubmission: Ref<boolean> = ref(false)
const highlightLogin: Ref<boolean> = ref(false)
const highlightPassword: Ref<boolean> = ref(false)
const shakeLoginButton: Ref<boolean> = ref(false)

const authStore = useAuthStore()
const runtimeStore = useRuntimeStore()

function reportAuthenticationError(message: string) {
  runtimeStore.reportError(`Authentication error: ${message}`)
  setTrueFor(shakeLoginButton, 300)
  disableSubmission.value = false
}

function setTrueFor(reference: Ref<boolean>, timeout: number) {
  reference.value = true
  setTimeout(() => {
    reference.value = false
  }, timeout)
}

async function submitLogin() {
  if (username.value == null || username.value == '') {
    reportAuthenticationError('Username is required')
    setTrueFor(highlightLogin, 2000)
    return
  }
  if (password.value == null || password.value == '') {
    reportAuthenticationError('Password is required')
    setTrueFor(highlightPassword, 2000)
    return
  }
  try {
    disableSubmission.value = true
    const response = await gateway.login({ user: username.value, password: password.value })
    authStore.login(response.token, username.value, response.fullname, response.groups)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      reportAuthenticationError(error.message)
    } else if (error instanceof Error) {
      runtimeStore.reportError(`Other error: ${error.message}`)
    }
  }
}
</script>

<template>
  <main>
    <section class="bg-slurmweb-light dark:bg-gray-900">
      <div class="mx-auto flex h-screen flex-col items-center justify-center px-6 py-4 lg:py-0">
        <div
          class="w-full rounded-lg bg-white shadow-sm sm:max-w-md md:mt-0 xl:p-0 dark:border dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="space-y-4 p-6 sm:p-8 md:space-y-6">
            <img src="/logo/slurm-web_logo.png" class="m-auto mb-8 block dark:hidden" />
            <img src="/logo/slurm-web_logo_dark.png" class="m-auto mb-8 hidden dark:block" />
            <form class="space-y-4 md:space-y-6" action="#" @submit.prevent="submitLogin">
              <div>
                <label
                  for="user"
                  class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >Login</label
                >
                <input
                  name="user"
                  id="user"
                  v-model="username"
                  class="focus:ring-slurmweb dark:focus:border-slurmweb block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-300 transition-colors focus:ring-2 focus:outline-hidden dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  :class="{ 'bg-gray-50': !highlightLogin, 'bg-red-200': highlightLogin }"
                  placeholder="Username"
                />
              </div>
              <div>
                <label
                  for="password"
                  class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >Password</label
                >
                <input
                  type="password"
                  name="password"
                  id="password"
                  v-model="password"
                  class="focus:ring-slurmweb dark:focus:border-slurmweb block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-300 focus:ring-2 focus:outline-hidden dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  :class="{ 'bg-gray-50': !highlightPassword, 'bg-red-200': highlightPassword }"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                :disabled="disableSubmission"
                class="focus:ring-primary-300 dark:bg-slurmweb-dark dark:hover:bg-slurmweb dark:focus:ring-slurmweb-verydark bg-slurmweb hover:bg-slurmweb-dark w-full rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:ring-4 focus:outline-hidden disabled:bg-slate-300 disabled:dark:bg-slate-700"
                :class="{ 'animate-horizontal-shake': shakeLoginButton }"
              >
                <template v-if="disableSubmission">
                  <svg
                    class="mx-2 -ml-2 inline-block h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Authenticating
                </template>
                <template v-else> Sign in </template>
              </button>
            </form>
          </div>
        </div>
        <LoginServiceMessage />
      </div>
    </section>
  </main>
</template>
