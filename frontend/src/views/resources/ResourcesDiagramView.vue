<!--
  Copyright (c) 2025-2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'
import type { ResourcesLayout, ResourcesRepresentation } from '@/stores/runtime/resources'

/* Resources diagram with the representation and layout given by the route. */
const {
  cluster,
  mode,
  layout = '2d'
} = defineProps<{
  cluster: string
  mode: ResourcesRepresentation
  layout?: ResourcesLayout
}>()
</script>

<template>
  <ResourcesDiagramGeneric :cluster="cluster" :mode="mode" :layout="layout" />
</template>
