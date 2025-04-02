/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MetricRange } from '@/composables/GatewayAPI'

/*
 * Dashboard view settings
 */

export interface DashboardQueryParameters {
  range?: string
  cores?: boolean
}

export const useDashboardRuntimeStore = defineStore('dashboardRuntime', () => {
  const range = ref<MetricRange>('hour')
  const coresToggle = ref(false)
  function query() {
    const result: DashboardQueryParameters = {}
    if (range.value != 'hour') {
      result.range = range.value
    }
    if (coresToggle.value) {
      result.cores = coresToggle.value
    }
    return result
  }
  return {
    range,
    coresToggle,
    query
  }
})
