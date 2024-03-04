<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Ref, PropType } from 'vue'
import type { ClusterNode } from '@/composables/GatewayAPI'
import { getNodeAllocationState } from '@/composables/GatewayAPI'

const props = defineProps({
  node: {
    type: Object as PropType<ClusterNode>,
    required: true
  }
})

interface NodeAllocationLabelColors {
  label: string
  color: string
}

const nodeAllocationLabelColor: Ref<NodeAllocationLabelColors | undefined> = ref()

function getStatusColor(): NodeAllocationLabelColors {
  switch (getNodeAllocationState(props.node)) {
    case 'allocated':
      return {
        label: 'allocated',
        color: 'fill-orange-500'
      }
    case 'mixed':
      return {
        label: 'mixed',
        color: 'fill-yellow-500'
      }
    case 'unavailable':
      return {
        label: 'unavailable',
        color: 'fill-red-500 opacity-30'
      }
    default:
      return {
        label: 'idle',
        color: 'fill-green-500'
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
    :class="nodeAllocationLabelColor.color"
  >
    <svg v-if="nodeAllocationLabelColor.label == 'idle'" viewBox="0 0 3.175 5.556" xmlns="http://www.w3.org/2000/svg" class="h-5 w-2">
      <path d="M2.38 0c.438 0 .794.355.794.794v3.969a.794.794 0 0 1-.794.793H.792a.794.794 0 0 1-.793-.793V.793C-.001.355.354 0 .792 0zm0 5.16c.22 0 .397-.178.397-.397V.793A.397.397 0 0 0 2.38.397H.793a.397.397 0 0 0-.397.397v3.969c0 .219.177.396.396.396z" clip-rule="evenodd" fill-rule="evenodd"/>
    </svg>

    <svg
      v-else-if="nodeAllocationLabelColor.label == 'mixed'"
      viewBox="0 0 3.175 5.556"
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-2"
    >
      <g stroke-width=".265">
        <path
          d="M.793 4.564a.2.2 0 0 0 .198.198h1.191c.11 0 .198-.088.198-.198V2.778a.2.2 0 0 0-.198-.198H.992a.2.2 0 0 0-.199.198z"
        />
        <path
          d="M-.001 4.762a.794.794 0 0 0 .794.794H2.38a.794.794 0 0 0 .794-.794V.793a.794.794 0 0 0-.794-.794H.793a.794.794 0 0 0-.794.794zM.396.793c0-.219.178-.397.397-.397H2.38c.22 0 .397.178.397.397v3.969a.397.397 0 0 1-.397.397H.793a.397.397 0 0 1-.397-.397z"
          clip-rule="evenodd"
          fill-rule="evenodd"
        />
      </g>
    </svg>

    <svg
      v-else-if="nodeAllocationLabelColor.label == 'allocated'"
      viewBox="0 0 3.175 5.556"
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-2"
    >
      <path
        d="M3.169.799a.794.794 0 0 0-.794-.794H.788a.794.794 0 0 0-.794.794v3.969a.794.794 0 0 0 .794.794h1.587a.794.794 0 0 0 .794-.794zm-.397 3.969a.397.397 0 0 1-.397.397H.788a.397.397 0 0 1-.397-.397V.799A.397.397 0 0 1 .788.402h1.587c.22 0 .397.178.397.397zM2.375.998a.2.2 0 0 0-.198-.199H.987a.2.2 0 0 0-.2.198v3.572a.2.2 0 0 0 .2.199h1.19a.2.2 0 0 0 .198-.199z"
        clip-rule="evenodd"
        fill-rule="evenodd"
      />
    </svg>

    <svg v-else viewBox="0 0 3.175 5.556" xmlns="http://www.w3.org/2000/svg" class="h-5 w-2">
      <path
        d="M2.38 0c.438 0 .794.355.794.794v3.969a.794.794 0 0 1-.794.793H.792a.794.794 0 0 1-.793-.793V.793C-.001.355.354 0 .792 0zm0 5.16c.22 0 .397-.178.397-.397V.793A.397.397 0 0 0 2.38.397H.793a.397.397 0 0 0-.397.397v3.969c0 .219.177.396.396.396z"
        clip-rule="evenodd"
        fill-rule="evenodd"
      />
      <path
        d="m-202.82-120.86 1.983 1.741m-.003-1.741-1.983 1.741"
        transform="matrix(.99497 0 0 1.1148 202.405 136.545)"
        fill="none"
        stroke="#000"
        stroke-width=".265"
      />
    </svg>

    <span class="align-">
      {{ nodeAllocationLabelColor.label.toUpperCase() }}
    </span>
  </span>
</template>
