<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const cluster: Ref<string> = ref(props.cluster)
const clusterNotFound: Ref<boolean> = ref(false)
const runtimeStore = useRuntimeStore()

onMounted(() => {
  if (!runtimeStore.checkClusterAvailable(cluster.value)) {
    clusterNotFound.value = true
  }
})
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="Accounts">
    <h1>Accounts cluster {{ cluster }}</h1>
  </ClusterMainLayout>
</template>
