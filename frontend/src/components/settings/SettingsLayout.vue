<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeaveSettingsButton from '@/components/settings/LeaveSettingsButton.vue'
</script>
<template>
  <div class="mx-16">
    <LeaveSettingsButton />
    <RouterView />
  </div>
</template>
