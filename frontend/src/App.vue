<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import NotificationsPanel from './components/NotificationsPanel.vue'
</script>

<template>
  <RouterView />
  <NotificationsPanel />
</template>
