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
import type {
  ClusterDescription,
  ClusterJob,
  ClusterNode,
  MetricRange
} from '@/composables/GatewayAPI'

/*
 * Dashboard view settings
 */

interface DashboardQueryParameters {
  range?: string
  cores?: boolean
}

const useDashboardRuntimeStore = defineStore('dashboardRuntime', () => {
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
const JobSortCriteria = ['id', 'user', 'state', 'priority', 'resources'] as const
export type JobSortCriterion = (typeof JobSortCriteria)[number]

const useJobsRuntimeStore = defineStore('jobsRuntime', () => {
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

export class Notification {
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

  const dashboard = useDashboardRuntimeStore()
  const jobs = useJobsRuntimeStore()
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

  function hasClusterPermission(clusterName: string, permission: string): boolean {
    const cluster = getCluster(clusterName)
    if (!cluster) return false
    return cluster.permissions.actions.includes(permission)
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
    dashboard,
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
    hasClusterPermission,
    addNotification,
    removeNotification,
    reportError,
    reportInfo
  }
})
