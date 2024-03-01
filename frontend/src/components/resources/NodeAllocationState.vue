<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Ref, PropType } from 'vue'
import type { ClusterNode } from '@/composables/GatewayAPI'
import { getNodeAllocationState } from '@/composables/GatewayAPI'
import { Battery0Icon, Battery50Icon, Battery100Icon, BoltSlashIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  node: {
    type: Object as PropType<ClusterNode>,
    required: true
  }
})

interface NodeAllocationLabelColors {
  icon: typeof Battery0Icon
  label: string
  color: string
  class: string
}

const nodeAllocationLabelColor: Ref<NodeAllocationLabelColors | undefined> = ref()

function getStatusColor(): NodeAllocationLabelColors {
  switch (getNodeAllocationState(props.node)) {
    case 'allocated':
      return {
        label: 'allocated',
        icon: Battery100Icon,
        color: 'fill-orange-500',
        class: ''
      }
    case 'mixed':
      return {
        label: 'mixed',
        icon: Battery50Icon,
        color: 'fill-yellow-500',
        class: ''
      }
    case 'unavailable':
      return {
        label: 'unavailable',
        icon: BoltSlashIcon,
        color: 'fill-red-500',
        class: 'opacity-30'
      }
    default:
      return {
        label: 'idle',
        icon: Battery0Icon,
        color: 'fill-green-500',
        class: ''
      }
  }
}

watch(
  () => props.node,
  () => {
    nodeAllocationLabelColor.value = getStatusColor()
  }
)

onMounted(() => {
  nodeAllocationLabelColor.value = getStatusColor()
})
</script>

<template>
  <span
    v-if="nodeAllocationLabelColor"
    class="inline-flex max-h-6 items-center gap-x-1.5 rounded-md align-middle text-xs font-medium"
    :class="nodeAllocationLabelColor.class"
  >
    <component
      :is="nodeAllocationLabelColor.icon"
      :class="[nodeAllocationLabelColor.color, 'h-6 w-6']"
    />
    {{ nodeAllocationLabelColor.label.toUpperCase() }}
  </span>
</template>
