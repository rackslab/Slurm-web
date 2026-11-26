<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import ResourcesDiagramGeneric from '@/components/resources/ResourcesDiagramGeneric.vue'

import type { ResourcesLayout } from '@/stores/runtime/resources'

const { cluster, layout = '2d' } = defineProps<{ cluster: string; layout?: ResourcesLayout }>()
</script>

<template>
  <ResourcesDiagramGeneric :cluster="cluster" mode="cores" :layout="layout" />
</template>
