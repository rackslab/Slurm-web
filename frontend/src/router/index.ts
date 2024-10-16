/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createRouter, createWebHistory, type RouteLocation } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import AnonymousView from '@/views/AnonymousView.vue'
import SignoutView from '@/views/SignoutView.vue'
import SettingsMainView from '@/views/settings/SettingsMain.vue'
import SettingsErrorsView from '@/views/settings/SettingsErrors.vue'
import SettingsAccountView from '@/views/settings/SettingsAccount.vue'
import ClustersView from '@/views/ClustersView.vue'
import JobsView from '@/views/JobsView.vue'
import JobView from '@/views/JobView.vue'
import ResourcesView from '@/views/ResourcesView.vue'
import NodeView from '@/views/NodeView.vue'
import QosView from '@/views/QosView.vue'
import ReservationsView from '@/views/ReservationsView.vue'
import SubmitNewJobView from '@/views/SubmitNewJobView.vue'
import JobConfigurationView from '@/views/JobConfigurationView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: {
        name: 'clusters'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/anonymous',
      name: 'anonymous',
      component: AnonymousView
    },
    {
      path: '/clusters',
      name: 'clusters',
      component: ClustersView
    },
    {
      path: '/signout',
      name: 'signout',
      component: SignoutView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsMainView,
      meta: {
        settings: true
      }
    },
    {
      path: '/settings/errors',
      name: 'settings-errors',
      component: SettingsErrorsView,
      meta: {
        settings: true
      }
    },
    {
      path: '/settings/account',
      name: 'settings-account',
      component: SettingsAccountView,
      meta: {
        settings: true
      }
    },
    {
      path: '/:cluster/dashboard',
      name: 'dashboard',
      component: DashboardView,
      props: true,
      meta: {
        entry: 'dashboard'
      }
    },
    {
      path: '/:cluster/jobs',
      name: 'jobs',
      component: JobsView,
      props: true,
      meta: {
        entry: 'jobs'
      }
    },
    {
      path: '/:cluster/jobs/submit-new-job',
      name: 'submit-new-job',
      component: SubmitNewJobView,
      props: true,
      meta: {
        entry: 'jobs'
      }
    },
    {
      path: '/:cluster/jobs/submit-new-job/:idTemplate',
      name: 'job-configuration',
      component: JobConfigurationView,
      props: true,
      meta: {
        entry: 'jobs'
      }
    },
    {
      path: '/:cluster/job/:id',
      name: 'job',
      component: JobView,
      props: (route: RouteLocation) => ({
        cluster: route.params.cluster,
        id: parseInt(route.params.id as string)
      }),
      meta: {
        entry: 'jobs'
      }
    },
    {
      path: '/:cluster/resources',
      name: 'resources',
      component: ResourcesView,
      props: true,
      meta: {
        entry: 'resources'
      }
    },
    {
      path: '/:cluster/node/:nodeName',
      name: 'node',
      component: NodeView,
      props: true,
      meta: {
        entry: 'resources'
      }
    },
    {
      path: '/:cluster/qos',
      name: 'qos',
      component: QosView,
      props: true,
      meta: {
        entry: 'qos'
      }
    },
    {
      path: '/:cluster/reservations',
      name: 'reservations',
      component: ReservationsView,
      props: true,
      meta: {
        entry: 'reservations'
      }
    }
  ]
})

router.beforeEach(async (to, from) => {
  /* redirect to login page if not logged in and trying to access a restricted page */
  const publicPages = ['/login', '/anonymous']
  const authRequired = !publicPages.includes(to.path)
  const auth = useAuthStore()
  const runtime = useRuntimeStore()
  const runtimeConfiguration = useRuntimeConfiguration()

  if (to.name == 'login' && !runtimeConfiguration.authentication) {
    return '/anonymous'
  }

  if (authRequired && !auth.token) {
    auth.returnUrl = to.fullPath
    if (runtimeConfiguration.authentication) {
      return '/login'
    } else {
      return '/anonymous'
    }
  }
  runtime.navigation = to.meta.entry as string
  runtime.routePath = to.path as string
  runtime.sidebarOpen = false

  if (to.params.cluster) {
    if (!runtime.currentCluster || to.params.cluster !== runtime.currentCluster.name) {
      runtime.currentCluster = runtime.getCluster(to.params.cluster as string)
      console.log(
        `New cluster ${runtime.currentCluster?.name} permissions: ${runtime.currentCluster?.permissions.actions}`
      )
    }
  } else {
    console.log(`Unsetting current cluster`)
    runtime.currentCluster = undefined
  }

  /* If entering settings page, save previous route to get it back */
  if (
    from.name !== undefined &&
    runtime.beforeSettingsRoute === undefined &&
    'settings' in to.meta
  ) {
    runtime.beforeSettingsRoute = from
  }
})

export default router
