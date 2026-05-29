/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { acctJobStates } from '@/composables/GatewayAPI'
import type { ClusterAcctJob, ClusterJob } from '@/composables/GatewayAPI'

/*
 * Jobs view settings
 */

export interface JobsViewFilters {
  /** Active (slurmctld) job states. */
  activeStates: string[]
  /** Terminal (slurmdb) job states for the past jobs view. */
  pastStates: string[]
  users: string[]
  accounts: string[]
  qos: string[]
  partitions: string[]
}

export interface JobsQueryParameters {
  past_hours?: number
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
const JobSortCriteria = ['id', 'user', 'state', 'priority', 'resources', 'end'] as const
export type JobSortCriterion = (typeof JobSortCriteria)[number]

const PAST_HOURS_PRESETS = [1, 6, 12, 24, 48, 168] as const

/** Default past jobs time window in the UI (omit past_hours from URL when selected). */
export const PAST_JOBS_DEFAULT_HOURS = 6

/** Default terminated jobs sort (omit sort/order from URL when selected). */
export const PAST_JOBS_DEFAULT_SORT: JobSortCriterion = 'end'
export const PAST_JOBS_DEFAULT_ORDER: JobSortOrder = 'desc'

export interface JobStateFilterOption {
  value: string
  label: string
}

/** Non-terminal slurmctld job states (active jobs list). */
export const ACTIVE_JOB_STATE_FILTERS: JobStateFilterOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completing', label: 'Completing' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'configuring', label: 'Configuring' }
]

/** Terminal slurmdb job states (terminated jobs list). */
export const PAST_JOB_STATE_FILTERS: JobStateFilterOption[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'preempted', label: 'Preempted' },
  { value: 'out_of_memory', label: 'Out of memory' },
  { value: 'node_fail', label: 'Node fail' },
  { value: 'boot_fail', label: 'Boot fail' },
  { value: 'deadline', label: 'Deadline' }
]

export function jobStateFilters(past: boolean): JobStateFilterOption[] {
  return past ? PAST_JOB_STATE_FILTERS : ACTIVE_JOB_STATE_FILTERS
}

export const useJobsRuntimeStore = defineStore('jobsRuntime', () => {
  const pastHours = ref(PAST_JOBS_DEFAULT_HOURS)
  const activeSort = ref<JobSortCriterion>('id')
  const activeOrder = ref<JobSortOrder>('asc')
  const pastSort = ref<JobSortCriterion>(PAST_JOBS_DEFAULT_SORT)
  const pastOrder = ref<JobSortOrder>(PAST_JOBS_DEFAULT_ORDER)
  const page = ref(1)
  const openFiltersPanel = ref(false)
  const filters = ref<JobsViewFilters>({
    activeStates: [],
    pastStates: [],
    users: [],
    accounts: [],
    qos: [],
    partitions: []
  })

  function restoreSortDefault(): void {
    activeSort.value = 'id'
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
  function removeActiveStateFilter(state: string) {
    filters.value.activeStates = filters.value.activeStates.filter((element) => element != state)
  }

  function removePastStateFilter(state: string) {
    filters.value.pastStates = filters.value.pastStates.filter((element) => element != state)
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
  function emptyFilters(past = false): boolean {
    const states = past ? filters.value.pastStates : filters.value.activeStates
    return (
      states.length == 0 &&
      filters.value.users.length == 0 &&
      filters.value.accounts.length == 0 &&
      filters.value.qos.length == 0 &&
      filters.value.partitions.length == 0
    )
  }
  function matchesFilters(job: ClusterJob): boolean {
    if (emptyFilters(false)) {
      return true
    }
    if (filters.value.activeStates.length != 0) {
      if (
        !filters.value.activeStates.some((state) => {
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

  function matchesAcctJobFilters(job: ClusterAcctJob): boolean {
    if (emptyFilters(true)) {
      return true
    }
    const states = acctJobStates(job)
    if (filters.value.pastStates.length != 0) {
      if (
        !filters.value.pastStates.some((state) => {
          return states.map((_state) => _state.toLocaleLowerCase()).includes(state.toLocaleLowerCase())
        })
      ) {
        return false
      }
    }
    if (filters.value.users.length != 0) {
      if (
        !filters.value.users.some((user) => {
          return user.toLocaleLowerCase() == job.user.toLocaleLowerCase()
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

  function pastHoursPresets(maxHours: number, defaultHours?: number): number[] {
    const presets = PAST_HOURS_PRESETS.filter((hours) => hours <= maxHours)
    if (defaultHours != null && defaultHours <= maxHours && !presets.some((h) => h === defaultHours)) {
      return [...presets, defaultHours].sort((a, b) => a - b)
    }
    return presets
  }

  function query(): JobsQueryParameters {
    const result: JobsQueryParameters = {}
    if (page.value != 1) {
      result.page = page.value
    }
    if (activeSort.value != 'id') {
      result.sort = activeSort.value
    }
    if (activeOrder.value != 'asc') {
      result.order = activeOrder.value
    }
    if (filters.value.activeStates.length > 0) {
      result.states = filters.value.activeStates.join()
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

  function pastQuery(): JobsQueryParameters {
    const result: JobsQueryParameters = {}
    if (page.value != 1) {
      result.page = page.value
    }
    if (pastSort.value !== PAST_JOBS_DEFAULT_SORT) {
      result.sort = pastSort.value
    }
    if (pastOrder.value !== PAST_JOBS_DEFAULT_ORDER) {
      result.order = pastOrder.value
    }
    if (pastHours.value !== PAST_JOBS_DEFAULT_HOURS) {
      result.past_hours = pastHours.value
    }
    if (filters.value.pastStates.length > 0) {
      result.states = filters.value.pastStates.join()
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
    pastHours,
    pastHoursPresets,
    activeSort,
    activeOrder,
    pastSort,
    pastOrder,
    page,
    openFiltersPanel,
    filters,
    restoreSortDefault,
    isValidSortOrder,
    isValidSortCriterion,
    removeActiveStateFilter,
    removePastStateFilter,
    removeUserFilter,
    removeAccountFilter,
    removeQosFilter,
    removePartitionFilter,
    emptyFilters,
    matchesFilters,
    matchesAcctJobFilters,
    query,
    pastQuery
  }
})
