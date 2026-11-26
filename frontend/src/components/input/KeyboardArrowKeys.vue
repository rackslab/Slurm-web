<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
/* Arrow keys laid out like on keyboards: up key above down key, left and right
 * keys on both sides of down key. With vertical directions, only up and down
 * keys are displayed. */
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon } from '@heroicons/vue/16/solid'
import KeyboardKey from '@/components/input/KeyboardKey.vue'

const { directions = 'all' } = defineProps<{
  directions?: 'all' | 'vertical'
}>()
</script>

<template>
  <span
    :class="[
      directions === 'all' ? 'grid-cols-3' : 'grid-cols-1',
      'inline-grid grid-rows-2 gap-px'
    ]"
    :data-directions="directions"
  >
    <KeyboardKey
      small
      data-key="up"
      :class="directions === 'all' ? 'col-start-2 row-start-1' : 'row-start-1'"
    >
      <ArrowUpIcon class="h-2.5 w-2.5" aria-hidden="true" /><span class="sr-only">Up</span>
    </KeyboardKey>
    <KeyboardKey v-if="directions === 'all'" small data-key="left" class="col-start-1 row-start-2">
      <ArrowLeftIcon class="h-2.5 w-2.5" aria-hidden="true" /><span class="sr-only">Left</span>
    </KeyboardKey>
    <KeyboardKey
      small
      data-key="down"
      :class="directions === 'all' ? 'col-start-2 row-start-2' : 'row-start-2'"
    >
      <ArrowDownIcon class="h-2.5 w-2.5" aria-hidden="true" /><span class="sr-only">Down</span>
    </KeyboardKey>
    <KeyboardKey v-if="directions === 'all'" small data-key="right" class="col-start-3 row-start-2">
      <ArrowRightIcon class="h-2.5 w-2.5" aria-hidden="true" /><span class="sr-only">Right</span>
    </KeyboardKey>
  </span>
</template>
