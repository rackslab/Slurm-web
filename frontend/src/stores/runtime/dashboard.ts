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

const chartResourcesTypes = ['nodes', 'cores', 'gpus'] as const
export type ChartResourcesType = (typeof chartResourcesTypes)[number]

export function isChartResourcesType(value: unknown): value is ChartResourcesType {
  return typeof value === 'string' && (chartResourcesTypes as readonly string[]).indexOf(value) >= 0
}

export interface DashboardQueryParameters {
  range?: string
  resources?: ChartResourcesType
}

export const useDashboardRuntimeStore = defineStore('dashboardRuntime', () => {
  const range = ref<MetricRange>('hour')
  const chartResourcesType = ref<ChartResourcesType>('nodes')
  function query() {
    const result: DashboardQueryParameters = {}
    if (range.value != 'hour') {
      result.range = range.value
    }
    if (chartResourcesType.value != 'nodes') {
      result.resources = chartResourcesType.value
    }
    return result
  }
  return {
    range,
    chartResourcesType,
    query
  }
})
