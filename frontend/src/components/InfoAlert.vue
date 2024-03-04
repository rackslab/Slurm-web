<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/20/solid'
</script>

<template>
  <div class="rounded-md bg-blue-50 p-4">
    <div class="flex">
      <div class="flex-shrink-0">
        <InformationCircleIcon class="h-5 w-5 text-blue-400" aria-hidden="true" />
      </div>
      <p class="ml-3 text-sm text-blue-700"><slot></slot></p>
    </div>
  </div>
</template>
