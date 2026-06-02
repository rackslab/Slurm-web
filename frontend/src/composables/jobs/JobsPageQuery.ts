/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import {
  PAST_JOBS_DEFAULT_HOURS,
  type JobSortCriterion,
  type JobSortOrder
} from '@/stores/runtime/jobs'

export type JobsPageRouteName = 'jobs' | 'jobs-past'

const ACTIVE_JOBS_QUERY_PARAMETERS = [
  'sort',
  'states',
  'users',
  'accounts',
  'page',
  'qos',
  'partitions'
] as const

const PAST_JOBS_QUERY_PARAMETERS = [...ACTIVE_JOBS_QUERY_PARAMETERS, 'past_hours'] as const

export function useJobsPageQuery(routeName: JobsPageRouteName) {
  const route = useRoute()
  const router = useRouter()
  const runtimeStore = useRuntimeStore()

  const queryParameters =
    routeName === 'jobs-past' ? PAST_JOBS_QUERY_PARAMETERS : ACTIVE_JOBS_QUERY_PARAMETERS

  function maxPastHours(): number {
    return runtimeStore.currentCluster?.slurmdbd.jobs_max_hours ?? 168
  }

  function updateQueryParameters() {
    const query =
      routeName === 'jobs-past' ? runtimeStore.jobs.pastQuery() : runtimeStore.jobs.query()
    router.push({ name: routeName, query: query as LocationQueryRaw })
  }

  function syncPastHoursFromRoute(): number {
    let pastHours = PAST_JOBS_DEFAULT_HOURS
    if (route.query.past_hours) {
      const hours = parseInt(route.query.past_hours as string)
      if (!Number.isNaN(hours)) {
        pastHours = Math.max(1, Math.min(hours, maxPastHours()))
      }
    }
    return pastHours
  }

  function syncFiltersFromRoute() {
    /* Reinitialize filters if route has query parameters */
    runtimeStore.jobs.filters.users = []
    runtimeStore.jobs.filters.accounts = []
    runtimeStore.jobs.filters.qos = []
    runtimeStore.jobs.filters.partitions = []
    if (routeName === 'jobs-past') {
      runtimeStore.jobs.filters.pastStates = []
    } else {
      runtimeStore.jobs.filters.activeStates = []
    }

    if (route.query.sort && runtimeStore.jobs.isValidSortCriterion(route.query.sort)) {
      /* Retrieve the sort criteria from query and update the store */
      if (routeName === 'jobs-past') {
        runtimeStore.jobs.pastSort = route.query.sort as JobSortCriterion
      } else {
        runtimeStore.jobs.activeSort = route.query.sort as JobSortCriterion
      }
    }
    if (route.query.order && runtimeStore.jobs.isValidSortOrder(route.query.order)) {
      /* Retrieve the sort order from query and update the store */
      if (routeName === 'jobs-past') {
        runtimeStore.jobs.pastOrder = route.query.order as JobSortOrder
      } else {
        runtimeStore.jobs.activeOrder = route.query.order as JobSortOrder
      }
    }
    if (route.query.page) {
      /* Retrieve the page number from query and update the store. If the
       * lastpage is lower than the page query, set store to lastpage and update
       * query parameters. */
      runtimeStore.jobs.page = parseInt(route.query.page as string)
    }
    if (route.query.states) {
      /* Retrieve the states filters from query and update the store */
      const states = (route.query.states as string).split(',')
      if (routeName === 'jobs-past') {
        runtimeStore.jobs.filters.pastStates = states
      } else {
        runtimeStore.jobs.filters.activeStates = states
      }
    }
    if (route.query.users) {
      /* Retrieve the users filters from query and update the store */
      runtimeStore.jobs.filters.users = (route.query.users as string).split(',')
    }
    if (route.query.accounts) {
      /* Retrieve the account filters from query and update the store */
      runtimeStore.jobs.filters.accounts = (route.query.accounts as string).split(',')
    }
    if (route.query.qos) {
      /* Retrieve the qos filters from query and update the store */
      runtimeStore.jobs.filters.qos = (route.query.qos as string).split(',')
    }
    if (route.query.partitions) {
      /* Retrieve the partitions filters from query and update the store */
      runtimeStore.jobs.filters.partitions = (route.query.partitions as string).split(',')
    }
    if (routeName === 'jobs-past') {
      runtimeStore.jobs.pastHours = syncPastHoursFromRoute()
    }
  }

  function watchFilterQuerySync() {
    /*
     * Watch states and users filters in Pinia store to update route query
     * accordingly.
     *
     * This is not explained in Pinia documentation but to watch Pinia store nested
     * attribute, the solution is to used watch getter. This solution has been found
     * here: https://stackoverflow.com/a/71937507
     */
    watch(
      () =>
        routeName === 'jobs-past'
          ? runtimeStore.jobs.filters.pastStates
          : runtimeStore.jobs.filters.activeStates,
      () => updateQueryParameters()
    )
    watch(
      () => runtimeStore.jobs.filters.users,
      () => updateQueryParameters()
    )
    watch(
      () => runtimeStore.jobs.filters.accounts,
      () => updateQueryParameters()
    )
    watch(
      () => runtimeStore.jobs.filters.qos,
      () => updateQueryParameters()
    )
    watch(
      () => runtimeStore.jobs.filters.partitions,
      () => updateQueryParameters()
    )
    watch(
      () => runtimeStore.jobs.page,
      () => updateQueryParameters()
    )
  }

  function setupFilterQuerySync() {
    watchFilterQuerySync()

    const hasQuery = queryParameters.some((parameter) => parameter in route.query)

    if (hasQuery) {
      syncFiltersFromRoute()
    } else {
      /* Route has no query parameter. Update query parameters to match those that
       * can be defined in runtime store. This typically happens when user define
       * filters, leave jobs route (eg. in left menu) and comes back. */
      updateQueryParameters()
    }
  }

  return {
    updateQueryParameters,
    syncFiltersFromRoute,
    setupFilterQuerySync
  }
}
