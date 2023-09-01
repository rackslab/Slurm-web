<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Ref, PropType } from 'vue'

const props = defineProps({
  states: {
    type: Array as PropType<string[]>,
    required: true
  }
})

interface NodeMainLabelColors {
  span: string
  label: string
  circle: string
}

const nodeMainState: Ref<NodeMainLabelColors | undefined> = ref()

function getStatusColor(): NodeMainLabelColors {
  if (props.states.includes('DOWN')) {
    return {
      span: 'bg-red-100 text-red-700',
      label: 'down',
      circle: 'fill-red-600'
    }
  } else if (props.states.includes('DRAIN')) {
    return {
      span: 'bg-fuchsia-100 text-fuchsia-700',
      label: 'drain',
      circle: 'fill-fuchsia-700'
    }
  } else if (props.states.includes('DRAINING')) {
    return {
      span: 'bg-fuchsia-100 text-fuchsia-700',
      label: 'draining',
      circle: 'fill-fuchsia-300'
    }
  } else {
    return {
      span: 'bg-green-100 text-green-700',
      label: 'up',
      circle: 'fill-green-500'
    }
  }
}
watch(
  () => props.states,
  () => {
    nodeMainState.value = getStatusColor()
  }
)
onMounted(() => {
  nodeMainState.value = getStatusColor()
})
</script>

<template>
  <span
    v-if="nodeMainState"
    :class="[
      'max-h-6 text-xs',
      'inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium',
      nodeMainState.span
    ]"
  >
    <svg :class="['h-1.5 w-1.5', nodeMainState.circle]" viewBox="0 0 6 6" aria-hidden="true">
      <circle cx="3" cy="3" r="3" />
    </svg>
    {{ nodeMainState.label.toUpperCase() }}
  </span>
</template>
