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
import type { ClusterDescription } from '@/composables/GatewayAPI'
import { useDashboardRuntimeStore } from './runtime/dashboard'
import type { DashboardQueryParameters } from './runtime/dashboard'
import { useJobsRuntimeStore } from './runtime/jobs'
import type { JobsQueryParameters } from './runtime/jobs'
import { useResourcesRuntimeStore } from './runtime/resources'
import type { ResourcesQueryParameters } from './runtime/resources'

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
  const routePath: Ref<string> = ref('/')
  const beforeSettingsRoute: Ref<RouteLocation | undefined> = ref(undefined)

  const dashboard = useDashboardRuntimeStore()
  const jobs = useJobsRuntimeStore()
  const resources = useResourcesRuntimeStore()

  const errors: Ref<Array<RuntimeError>> = ref([])
  const notifications: Ref<Array<Notification>> = ref([])

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
    routePath,
    beforeSettingsRoute,
    dashboard,
    jobs,
    resources,
    errors,
    notifications,
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
