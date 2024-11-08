<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ClusterTRES } from '@/composables/GatewayAPI'

defineProps({
  tres: {
    type: Object as PropType<ClusterTRES[]>,
    required: true
  }
})
</script>

<template>
  <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
    <ul>
      <li v-for="resource in tres" :key="resource.id">{{ resource.type }}: {{ resource.count }}</li>
    </ul>
  </dd>
</template>
