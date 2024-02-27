<script setup lang="ts">
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import type { ClusterQos } from '@/composables/GatewayAPI'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const { data, unable } = useClusterDataPoller<ClusterQos[]>('qos', 10000)
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="QOS">
    <div v-if="unable">Unable to retrieve QOS information from cluster {{ props.cluster }}</div>
    <ul v-else v-for="qos in data" :key="qos.name">
      <li>{{ qos.name }} ({{ qos.description }})</li>
    </ul>
  </ClusterMainLayout>
</template>
