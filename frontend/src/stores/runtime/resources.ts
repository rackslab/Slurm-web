/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getNodeMainState } from '@/composables/GatewayAPI'
import type { ClusterNode } from '@/composables/GatewayAPI'

/*
 * Resources view settings
 */

export interface ResourcesViewFilters {
  states: string[]
  partitions: string[]
}

export interface ResourcesQueryParameters {
  states?: string
  partitions?: string
}

export const resourcesStates = [
  { value: 'up', label: 'Up' },
  { value: 'drain', label: 'Drain' },
  { value: 'draining', label: 'Draining' },
  { value: 'down', label: 'Down' }
]

export const useResourcesRuntimeStore = defineStore('resourcesRuntime', () => {
  const openFiltersPanel = ref(false)
  const filters = ref<ResourcesViewFilters>({ states: [], partitions: [] })

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
        !filters.value.states.some((state) => state.toLocaleLowerCase() == getNodeMainState(node))
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
  return {
    openFiltersPanel,
    filters,
    removeStateFilter,
    removePartitionFilter,
    emptyFilters,
    matchesFilters,
    query
  }
})
