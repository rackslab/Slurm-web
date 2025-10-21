<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'

const { cluster } = defineProps<{ cluster: string }>()
</script>

<template>
  <ResourcesDiagramGeneric :cluster="cluster" mode="cores" />
</template>
