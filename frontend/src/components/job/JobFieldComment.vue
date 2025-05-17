<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { ClusterJobComment } from '@/composables/GatewayAPI'

const { comment } = defineProps<{ comment: ClusterJobComment }>()
</script>

<template>
  <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
    <p v-if="comment.administrator">
      <span class="italic">(administrator)</span> {{ comment.administrator }}
    </p>
    <p v-if="comment.system"><span class="italic">(system)</span> {{ comment.system }}</p>
    <p v-if="comment.job"><span class="italic">(job)</span> {{ comment.job }}</p>
  </dd>
</template>
