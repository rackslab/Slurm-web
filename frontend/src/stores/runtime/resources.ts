/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getNodeMainState } from '@/composables/GatewayAPI'
import type { ClusterNode, ClusterNodeMainState } from '@/composables/GatewayAPI'

/*
 * Resources view settings
 */

const filtersClusterNodeMainStates = ['down', 'error', 'drain', 'fail', 'up'] as const
export type FiltersClusterNodeMainState = (typeof filtersClusterNodeMainStates)[number]

export function isFiltersClusterNodeMainState(
  value: unknown
): value is FiltersClusterNodeMainState {
  return (
    typeof value === 'string' &&
    (filtersClusterNodeMainStates as readonly string[]).indexOf(value) >= 0
  )
}

export const resourcesStates: Record<
  FiltersClusterNodeMainState,
  { label: string; status: ClusterNodeMainState[] }
> = {
  up: { label: 'Up', status: ['up'] },
  drain: { label: 'Drain', status: ['drain', 'draining'] },
  down: { label: 'Down', status: ['down'] },
  error: { label: 'Error', status: ['error'] },
  fail: { label: 'Fail', status: ['fail', 'failing'] }
}

export interface ResourcesViewFilters {
  states: FiltersClusterNodeMainState[]
  partitions: string[]
}

export interface ResourcesQueryParameters {
  states?: string
  partitions?: string
}

export const useResourcesRuntimeStore = defineStore('resourcesRuntime', () => {
  const openFiltersPanel = ref(false)
  const filters = ref<ResourcesViewFilters>({ states: [], partitions: [] })
  const showNodeNames = ref<boolean>(JSON.parse(localStorage.getItem('showNodeNames') || 'true'))

  function removeStateFilter(state: string) {
    filters.value.states = filters.value.states.filter((element) => element != state)
  }
  function removePartitionFilter(partition: string) {
    filters.value.partitions = filters.value.partitions.filter((element) => element != partition)
  }
  function emptyFilters(): boolean {
    return filters.value.states.length == 0 && filters.value.partitions.length == 0
  }

  function matchesFilters(node: ClusterNode): boolean {
    if (emptyFilters()) {
      return true
    }
    if (filters.value.states.length != 0) {
      if (
        !filters.value.states.some((state) =>
          resourcesStates[state].status.includes(getNodeMainState(node.state))
        )
      ) {
        return false
      }
    }
    if (filters.value.partitions.length != 0) {
      if (!filters.value.partitions.some((partition) => node.partitions.includes(partition))) {
        return false
      }
    }

    return true
  }
  function query(): ResourcesQueryParameters {
    const result: ResourcesQueryParameters = {}
    if (filters.value.states.length > 0) {
      result.states = filters.value.states.join()
    }
    if (filters.value.partitions.length > 0) {
      result.partitions = filters.value.partitions.join()
    }
    return result
  }

  watch(showNodeNames, (value: boolean) => {
    localStorage.setItem('showNodeNames', JSON.stringify(value))
  })

  return {
    openFiltersPanel,
    filters,
    showNodeNames,
    removeStateFilter,
    removePartitionFilter,
    emptyFilters,
    matchesFilters,
    query
  }
})
