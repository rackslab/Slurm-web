<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { AuthenticationError } from '@/composables/HTTPErrors'

const msg: Ref<string> = ref('')

const gateway = useGatewayAPI()
const authStore = useAuthStore()
const runtimeStore = useRuntimeStore()
const runtimeConfiguration = useRuntimeConfiguration()

function reportAuthenticationError(message: string) {
  runtimeStore.reportError(`Authentication error: ${message}`)
  msg.value = `Anonymous access failed: ${message}`
}

onMounted(async () => {
  if (runtimeConfiguration.authentication) {
    msg.value = 'Anonymous access is blocked because authentication is enabled.'
  } else {
    try {
      let response = await gateway.anonymousLogin()
      authStore.anonymousLogin(response.token)
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        reportAuthenticationError(error.message)
      } else {
        runtimeStore.reportError(`Other error: ${error.message}`)
      }
    }
  }
})
</script>

<template>
  <main>
    <section class="bg-slurmweb-light dark:bg-gray-900">
      <div class="mx-auto flex h-screen flex-col items-center justify-center px-6 py-4 lg:py-0">
        <div
          class="w-full rounded-lg bg-white shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-0 xl:p-0"
        >
          <div class="space-y-4 p-6 sm:p-8 md:space-y-6">
            {{ msg }}
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
