<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { ClusterJobExitCode } from '@/composables/GatewayAPI'

const { exit_code } = defineProps<{ exit_code: ClusterJobExitCode }>()
</script>

<template>
  <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
    {{ exit_code.status[0] }} ({{ exit_code.return_code.number }})
  </dd>
</template>
