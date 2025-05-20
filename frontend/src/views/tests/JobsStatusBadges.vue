<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'

const badges = [
  ['PENDING'],
  ['RUNNING'],
  ['SUSPENDED'],
  ['COMPLETED'],
  ['CANCELLED'],
  ['FAILED'],
  ['TIMEOUT'],
  ['NODE_FAIL'],
  ['PREEMPTED'],
  ['BOOT_FAIL'],
  ['DEADLINE'],
  ['OUT_OF_MEMORY'],
  ['RUNNING', 'COMPLETING'],
  ['COMPLETED', 'STAGE_OUT'],
  ['PENDING', 'CONFIGURING'],
  ['RUNNING', 'RESIZING'],
  ['PENDING', 'REQUEUD'],
  ['PENDING', 'REQUEUE_FED'],
  ['PENDING', 'REQUEUE_HOLD'],
  ['PENDING', 'RESV_DEL_HOLD'],
  ['FAILED', 'SPECIAL_EXIT'],
  ['FAILED', 'STOPPED'],
  ['FAILED', 'REVOKED'],
  ['TIMEOUT', 'SIGNALING']
]
</script>

<template>
  <div class="container m-auto max-w-2xl">
    <span v-for="badge in badges" class="m-4 mx-0.5">
      <JobStatusBadge :status="badge" />
    </span>
  </div>
</template>
