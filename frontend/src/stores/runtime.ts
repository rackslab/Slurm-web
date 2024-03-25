/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { RouteLocation } from 'vue-router'
import { getNodeMainState } from '@/composables/GatewayAPI'
import type { ClusterDescription, ClusterJob, ClusterNode } from '@/composables/GatewayAPI'

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

interface JobsQueryParameters {
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
const JobSortCriteria = ['id', 'user', 'state', 'priority'] as const
export type JobSortCriterion = (typeof JobSortCriteria)[number]

export class JobsViewSettings {
  sort: JobSortCriterion = 'id'
  order: JobSortOrder = 'asc'
  page: number = 1
  openFiltersPanel: boolean = false
  filters: JobsViewFilters = { states: [], users: [], accounts: [], qos: [], partitions: [] }

  restoreSortDefault(): void {
    this.sort = 'id'
  }
  isValidSortOrder(order: unknown) {
    if (typeof order === 'string' && JobSortOrders.includes(order as JobSortOrder)) {
      return true
    }
    return false
  }
  isValidSortCriterion(criterion: unknown) {
    if (typeof criterion === 'string' && JobSortCriteria.includes(criterion as JobSortCriterion)) {
      return true
    }
    return false
  }
  removeStateFilter(state: string) {
    this.filters.states = this.filters.states.filter((element) => element != state)
  }

  removeUserFilter(user: string) {
    this.filters.users = this.filters.users.filter((element) => element != user)
  }

  removeAccountFilter(account: string) {
    this.filters.accounts = this.filters.accounts.filter((element) => element != account)
  }

  removeQosFilter(qos: string) {
    this.filters.qos = this.filters.qos.filter((element) => element != qos)
  }

  removePartitionFilter(partition: string) {
    this.filters.partitions = this.filters.partitions.filter((element) => element != partition)
  }
  emptyFilters(): boolean {
    return (
      this.filters.states.length == 0 &&
      this.filters.users.length == 0 &&
      this.filters.accounts.length == 0 &&
      this.filters.qos.length == 0 &&
      this.filters.partitions.length == 0
    )
  }
  matchesFilters(job: ClusterJob): boolean {
    if (this.emptyFilters()) {
      return true
    }
    if (this.filters.states.length != 0) {
      if (
        !this.filters.states.some((state) => {
          return state.toLocaleLowerCase() == job.job_state.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (this.filters.users.length != 0) {
      if (
        !this.filters.users.some((user) => {
          return user.toLocaleLowerCase() == job.user_name.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (this.filters.accounts.length != 0) {
      if (
        !this.filters.accounts.some((account) => {
          return account.toLocaleLowerCase() == job.account.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (this.filters.qos.length != 0) {
      if (
        !this.filters.qos.some((qos) => {
          return qos.toLocaleLowerCase() == job.qos.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }
    if (this.filters.partitions.length != 0) {
      if (
        !this.filters.partitions.some((partition) => {
          return partition.toLocaleLowerCase() == job.partition.toLocaleLowerCase()
        })
      ) {
        return false
      }
    }

    return true
  }
  query(): JobsQueryParameters {
    const result: JobsQueryParameters = {}
    if (this.page != 1) {
      result.page = this.page
    }
    if (this.sort != 'id') {
      result.sort = this.sort
    }
    if (this.order != 'asc') {
      result.order = this.order
    }
    if (this.filters.states.length > 0) {
      result.states = this.filters.states.join()
    }
    if (this.filters.users.length > 0) {
      result.users = this.filters.users.join()
    }
    if (this.filters.accounts.length > 0) {
      result.accounts = this.filters.accounts.join()
    }
    if (this.filters.qos.length > 0) {
      result.qos = this.filters.qos.join()
    }
    if (this.filters.partitions.length > 0) {
      result.partitions = this.filters.partitions.join()
    }
    return result
  }
}

/*
 * Resources view settings
 */

export interface ResourcesViewFilters {
  states: string[]
  partitions: string[]
}

interface ResourcesQueryParameters {
  states?: string
  partitions?: string
}

export const resourcesStates = [
  { value: 'up', label: 'Up' },
  { value: 'drain', label: 'Drain' },
  { value: 'draining', label: 'Draining' },
  { value: 'down', label: 'Down' }
]

export class ResourcesViewSettings {
  openFiltersPanel: boolean = false
  filters: ResourcesViewFilters = { states: [], partitions: [] }
  removeStateFilter(state: string) {
    this.filters.states = this.filters.states.filter((element) => element != state)
  }

  removePartitionFilter(partition: string) {
    this.filters.partitions = this.filters.partitions.filter((element) => element != partition)
  }
  emptyFilters(): boolean {
    return this.filters.states.length == 0 && this.filters.partitions.length == 0
  }
  matchesFilters(node: ClusterNode): boolean {
    if (this.emptyFilters()) {
      return true
    }
    if (this.filters.states.length != 0) {
      if (
        !this.filters.states.some((state) => state.toLocaleLowerCase() == getNodeMainState(node))
      ) {
        return false
      }
    }
    if (this.filters.partitions.length != 0) {
      if (!this.filters.partitions.some((partition) => node.partitions.includes(partition))) {
        return false
      }
    }

    return true
  }
  query(): ResourcesQueryParameters {
    const result: ResourcesQueryParameters = {}
    if (this.filters.states.length > 0) {
      result.states = this.filters.states.join()
    }
    if (this.filters.partitions.length > 0) {
      result.partitions = this.filters.partitions.join()
    }
    return result
  }
}

/*
 * Shared settings
 */

type NotificationType = 'INFO' | 'ERROR'

class Notification {
  id: number
  type: NotificationType
  message: string
  timeout: number
  constructor(type: NotificationType, message: string, timeout: number) {
    this.id = Date.now()
    this.type = type
    this.message = message
    this.timeout = timeout
  }
}

class RuntimeError {
  timestamp: Date
  route: string
  message: string
  constructor(route: string, message: string) {
    this.timestamp = new Date()
    this.route = route
    this.message = message
  }
}

export interface RuntimeStore {
  reportError: CallableFunction
}

export const useRuntimeStore = defineStore('runtime', () => {
  const navigation: Ref<string> = ref('home')
  const routePath: Ref<string> = ref('/')
  const beforeSettingsRoute: Ref<RouteLocation | undefined> = ref(undefined)

  const jobs: Ref<JobsViewSettings> = ref(new JobsViewSettings())
  const resources: Ref<ResourcesViewSettings> = ref(new ResourcesViewSettings())

  const errors: Ref<Array<RuntimeError>> = ref([])
  const notifications: Ref<Array<Notification>> = ref([])
  const sidebarOpen: Ref<boolean> = ref(false)

  const availableClusters: Ref<Array<ClusterDescription>> = ref(
    JSON.parse(localStorage.getItem('availableClusters') || '[]') as ClusterDescription[]
  )
  const currentCluster: Ref<ClusterDescription | undefined> = ref()

  function addCluster(cluster: ClusterDescription) {
    availableClusters.value.push(cluster)
    localStorage.setItem('availableClusters', JSON.stringify(availableClusters.value))
  }

  function getCluster(name: string): ClusterDescription {
    return availableClusters.value.filter((cluster) => cluster.name === name)[0]
  }

  function checkClusterAvailable(name: string): boolean {
    return availableClusters.value.filter((cluster) => cluster.name === name).length > 0
  }

  function hasPermission(permission: string): boolean {
    return (
      currentCluster.value === undefined ||
      currentCluster.value.permissions.actions.includes(permission)
    )
  }

  function addNotification(notification: Notification) {
    notifications.value.push(notification)
    setTimeout(removeNotification, notification.timeout * 1000, notification)
  }

  function removeNotification(searched: Notification) {
    console.log(`notification ${searched.id} is removed`)
    notifications.value = notifications.value.filter(
      (notification) => notification.id != searched.id
    )
  }

  function reportError(message: string) {
    errors.value.push(new RuntimeError(routePath.value, message))
    // Do not store more than 100 errors
    if (errors.value.length > 100) {
      errors.value = errors.value.slice(errors.value.length - 100)
    }
    addNotification(new Notification('ERROR', message, 5))
  }
  function reportInfo(message: string) {
    addNotification(new Notification('INFO', message, 5))
  }
  return {
    navigation,
    routePath,
    beforeSettingsRoute,
    jobs,
    resources,
    errors,
    notifications,
    sidebarOpen,
    availableClusters,
    currentCluster,
    addCluster,
    getCluster,
    checkClusterAvailable,
    hasPermission,
    addNotification,
    removeNotification,
    reportError,
    reportInfo
  }
})
