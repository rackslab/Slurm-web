/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ClusterJob } from '@/composables/GatewayAPI'

/*
 * Jobs view settings
 */

export interface JobsViewFilters {
  states: string[]
  users: string[]
  accounts: string[]
  qos: string[]
  partitions: string[]
}

export interface JobsQueryParameters {
  sort?: string
  order?: string
  states?: string
  users?: string
  accounts?: string
  qos?: string
  partitions?: string
  page?: number
}

const JobSortOrders = ['asc', 'desc'] as const
export type JobSortOrder = (typeof JobSortOrders)[number]
const JobSortCriteria = ['id', 'user', 'state', 'priority', 'resources'] as const
export type JobSortCriterion = (typeof JobSortCriteria)[number]

export const useJobsRuntimeStore = defineStore('jobsRuntime', () => {
  const sort = ref<JobSortCriterion>('id')
  const order = ref<JobSortOrder>('asc')
  const page = ref(1)
  const openFiltersPanel = ref(false)
  const filters = ref<JobsViewFilters>({
    states: [],
    users: [],
    accounts: [],
    qos: [],
    partitions: []
  })

  function restoreSortDefault(): void {
    sort.value = 'id'
  }
  function isValidSortOrder(order: unknown) {
    if (typeof order === 'string' && JobSortOrders.includes(order as JobSortOrder)) {
      return true
    }
    return false
  }
  function isValidSortCriterion(criterion: unknown) {
    if (typeof criterion === 'string' && JobSortCriteria.includes(criterion as JobSortCriterion)) {
      return true
    }
    return false
  }
  function removeStateFilter(state: string) {
    filters.value.states = filters.value.states.filter((element) => element != state)
  }

  function removeUserFilter(user: string) {
    filters.value.users = filters.value.users.filter((element) => element != user)
  }

  function removeAccountFilter(account: string) {
    filters.value.accounts = filters.value.accounts.filter((element) => element != account)
  }

  function removeQosFilter(qos: string) {
    filters.value.qos = filters.value.qos.filter((element) => element != qos)
  }

  function removePartitionFilter(partition: string) {
    filters.value.partitions = filters.value.partitions.filter((element) => element != partition)
  }
  function emptyFilters(): boolean {
    return (
      filters.value.states.length == 0 &&
      filters.value.users.length == 0 &&
      filters.value.accounts.length == 0 &&
      filters.value.qos.length == 0 &&
      filters.value.partitions.length == 0
    )
  }
  function matchesFilters(job: ClusterJob): boolean {
    if (emptyFilters()) {
      return true
    }
    if (filters.value.states.length != 0) {
      if (
        !filters.value.states.some((state) => {
          return job.job_state
            .map((_state) => _state.toLocaleLowerCase())
            .includes(state.toLocaleLowerCase())
        })
      ) {
        return false
      }
    }
    if (filters.value.users.length != 0) {
      if (
        !filters.value.users.some((user) => {
          return user.toLocaleLowerCase() == job.user_name.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (filters.value.accounts.length != 0) {
      if (
        !filters.value.accounts.some((account) => {
          return account.toLocaleLowerCase() == job.account.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (filters.value.qos.length != 0) {
      if (
        !filters.value.qos.some((qos) => {
          return qos.toLocaleLowerCase() == job.qos.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (filters.value.partitions.length != 0) {
      if (
        !filters.value.partitions.some((partition) => {
          return partition.toLocaleLowerCase() == job.partition.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }

    return true
  }
  function query(): JobsQueryParameters {
    const result: JobsQueryParameters = {}
    if (page.value != 1) {
      result.page = page.value
    }
    if (sort.value != 'id') {
      result.sort = sort.value
    }
    if (order.value != 'asc') {
      result.order = order.value
    }
    if (filters.value.states.length > 0) {
      result.states = filters.value.states.join()
    }
    if (filters.value.users.length > 0) {
      result.users = filters.value.users.join()
    }
    if (filters.value.accounts.length > 0) {
      result.accounts = filters.value.accounts.join()
    }
    if (filters.value.qos.length > 0) {
      result.qos = filters.value.qos.join()
    }
    if (filters.value.partitions.length > 0) {
      result.partitions = filters.value.partitions.join()
    }
    return result
  }
  return {
    sort,
    order,
    page,
    openFiltersPanel,
    filters,
    restoreSortDefault,
    isValidSortOrder,
    isValidSortCriterion,
    removeStateFilter,
    removeUserFilter,
    removeAccountFilter,
    removeQosFilter,
    removePartitionFilter,
    emptyFilters,
    matchesFilters,
    query
  }
})
