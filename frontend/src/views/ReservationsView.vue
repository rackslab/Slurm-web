<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="Reservations">
    <h1>Reservations cluster {{ props.cluster }}</h1>
  </ClusterMainLayout>
</template>