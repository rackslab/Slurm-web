<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ClusterJobExitCode } from '@/composables/GatewayAPI'

defineProps({
  exit_code: {
    type: Object as PropType<ClusterJobExitCode>,
    required: true
  }
})
</script>

<template>
  <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
    {{ exit_code.status }} ({{ exit_code.return_code }})
  </dd>
</template>
