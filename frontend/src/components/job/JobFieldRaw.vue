<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

const {
  field,
  monospace = false,
  to
} = defineProps<{
  field: string | number
  monospace?: boolean
  to?: RouteLocationRaw
}>()
</script>

<template>
  <dd
    :class="[
      monospace ? 'font-mono' : '',
      'mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300'
    ]"
  >
    <RouterLink
      v-if="to"
      :to="to"
      class="text-slurmweb hover:text-slurmweb-dark dark:text-slurmweb-light font-semibold"
    >
      {{ field }}
    </RouterLink>
    <template v-else>
      {{ field }}
    </template>
  </dd>
</template>
