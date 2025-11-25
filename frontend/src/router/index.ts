/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { createRouter, createWebHistory, type RouteLocation } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import AnonymousView from '@/views/AnonymousView.vue'
import SignoutView from '@/views/SignoutView.vue'
import SettingsLayout from '@/components/settings/SettingsLayout.vue'
import SettingsMainView from '@/views/settings/SettingsMain.vue'
import SettingsErrorsView from '@/views/settings/SettingsErrors.vue'
import SettingsAccountView from '@/views/settings/SettingsAccount.vue'
import SettingsCacheView from '@/views/settings/SettingsCache.vue'
import ClustersView from '@/views/ClustersView.vue'
import JobsView from '@/views/JobsView.vue'
import JobView from '@/views/JobView.vue'
import ResourcesView from '@/views/resources/ResourcesView.vue'
import ResourcesDiagramNodesView from '@/views/resources/ResourcesDiagramNodesView.vue'
import ResourcesDiagramCoresView from '@/views/resources/ResourcesDiagramCoresView.vue'
import NodeView from '@/views/NodeView.vue'
import QosView from '@/views/QosView.vue'
import ReservationsView from '@/views/ReservationsView.vue'
import AccountsView from '@/views/AccountsView.vue'
import AccountView from '@/views/AccountView.vue'
import UserView from '@/views/UserView.vue'
import JobsStatusBadges from '@/views/tests/JobsStatusBadges.vue'
import NodesStatusBadges from '@/views/tests/NodesStatusBadges.vue'
import NotFoundView from '@/views/NotFoundView.vue'

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
      component: SettingsLayout,
      children: [
        {
          path: '',
          name: 'settings',
          component: SettingsMainView,
          meta: {
            settings: true
          }
        },
        {
          path: 'errors',
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
          path: '/settings/cache',
          name: 'settings-cache',
          component: SettingsCacheView,
          meta: {
            settings: true
          }
        }
      ]
    },
    {
      path: '/:cluster',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          props: true
        },
        {
          path: 'jobs',
          name: 'jobs',
          component: JobsView,
          props: true
        },
        {
          path: 'job/:id',
          name: 'job',
          component: JobView,
          props: (route: RouteLocation) => ({
            cluster: route.params.cluster,
            id: parseInt(route.params.id as string)
          })
        },
        {
          path: 'resources',
          name: 'resources',
          component: ResourcesView,
          props: true
        },
        {
          path: 'resources/diagram/nodes',
          name: 'resources-diagram-nodes',
          component: ResourcesDiagramNodesView,
          props: true
        },
        {
          path: 'resources/diagram/cores',
          name: 'resources-diagram-cores',
          component: ResourcesDiagramCoresView,
          props: true
        },
        {
          path: 'node/:nodeName',
          name: 'node',
          component: NodeView,
          props: true
        },
        {
          path: 'qos',
          name: 'qos',
          component: QosView,
          props: true
        },
        {
          path: 'reservations',
          name: 'reservations',
          component: ReservationsView,
          props: true
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: AccountsView,
          props: true
        },
        {
          path: 'accounts/:account',
          name: 'account',
          component: AccountView,
          props: true
        },
        {
          path: 'users/:user',
          name: 'user',
          component: UserView,
          props: true
        }
      ]
    },
    {
      path: '/tests/jobs-status-badges',
      name: 'tests-jobs-status-badges',
      component: JobsStatusBadges
    },
    {
      path: '/tests/nodes-status-badges',
      name: 'tests-nodes-status-badges',
      component: NodesStatusBadges
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
})

router.beforeEach(async (to, from) => {
  /* redirect to login page if not logged in and trying to access a restricted page */
  const publicPages = [
    '/login',
    '/signout',
    '/anonymous',
    '/tests/jobs-status-badges',
    '/tests/nodes-status-badges'
  ]
  const authRequired = !publicPages.includes(to.path) && to.name !== 'not-found'
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
  runtime.routePath = to.path as string

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
