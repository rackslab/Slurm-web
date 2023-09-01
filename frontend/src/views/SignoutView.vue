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
