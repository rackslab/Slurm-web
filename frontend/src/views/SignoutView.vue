<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'

const authStore = useAuthStore()
const runtimeStore = useRuntimeStore()
const router = useRouter()
const runtimeConfiguration = useRuntimeConfiguration()

onMounted(() => {
  authStore.logout()
  runtimeStore.reportInfo('You have been signed out')

  if (runtimeConfiguration.authentication) {
    router.push({ name: 'login' })
  } else {
    router.push({ name: 'anonymous' })
  }
})
</script>

<template>
  <main>Bye!</main>
</template>
