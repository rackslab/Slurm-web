<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import SettingsLayout from '@/components/settings/SettingsLayout.vue'
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
</script>

<template>
  <SettingsLayout>
    <SettingsTabs entry="General" />
    <div class="px-4 pt-16 sm:px-6 lg:px-8">General Settings</div>
  </SettingsLayout>
</template>
