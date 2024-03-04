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

const authStore = useAuthStore()
const runtimeStore = useRuntimeStore()
const router = useRouter()

onMounted(() => {
  authStore.logout()
  runtimeStore.reportInfo('You have been signed out')
  router.push({ name: 'login' })
})
</script>

<template>
  <main>Bye!</main>
</template>
