<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Ref, PropType } from 'vue'
import { Battery0Icon, Battery50Icon, Battery100Icon } from '@heroicons/vue/20/solid'
const props = defineProps({
  states: {
    type: Array as PropType<string[]>,
    required: true
  }
})

interface NodeAllocationLabelColors {
  icon: typeof Battery0Icon
  label: string
  color: string
}

const nodeAllocationState: Ref<NodeAllocationLabelColors | undefined> = ref()

function getStatusColor(): NodeAllocationLabelColors {
  if (props.states.includes('ALLOCATED')) {
    return {
      label: 'allocated',
      icon: Battery100Icon,
      color: 'fill-orange-600'
    }
  } else if (props.states.includes('MIXED')) {
    return {
      label: 'mixed',
      icon: Battery50Icon,
      color: 'fill-yellow-700'
    }
  } else {
    return {
      label: 'idle',
      icon: Battery0Icon,
      color: 'fill-green-500'
    }
  }
}

watch(
  () => props.states,
  () => {
    nodeAllocationState.value = getStatusColor()
  }
)

onMounted(() => {
  nodeAllocationState.value = getStatusColor()
})
</script>

<template>
  <span
    v-if="nodeAllocationState"
    class="max-h-6 text-xs inline-flex items-center gap-x-1.5 rounded-md font-medium align-middle"
  >
    <component :is="nodeAllocationState.icon" :class="[nodeAllocationState.color, 'h-6 w-6']" />
    {{ nodeAllocationState.label.toUpperCase() }}
  </span>
</template>
