<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import LeaveSettingsButton from '@/components/settings/LeaveSettingsButton.vue'
</script>
<template>
  <div class="mx-16">
    <LeaveSettingsButton />
    <slot></slot>
  </div>
</template>
