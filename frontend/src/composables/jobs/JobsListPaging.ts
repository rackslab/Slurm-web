/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { computed } from 'vue'
import type { Ref } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'
import type { JobSortCriterion, JobSortOrder } from '@/stores/runtime/jobs'

const JOBS_PAGE_SIZE = 100

export interface JobsListPage {
  id: number
  ellipsis: boolean
}

export interface JobsListPagingOptions<T> {
  match: (job: T) => boolean
  compareSort: (a: T, b: T, sort: JobSortCriterion, order: JobSortOrder) => number
  /** Use pastSort/pastOrder from the jobs store instead of sort/order. */
  past?: boolean
}

export function useJobsListPaging<T>(jobsList: Ref<T[]>, options: JobsListPagingOptions<T>) {
  const runtimeStore = useRuntimeStore()

  function compareJob(a: T, b: T): number {
    const sort = options.past ? runtimeStore.jobs.pastSort : runtimeStore.jobs.activeSort
    const order = options.past ? runtimeStore.jobs.pastOrder : runtimeStore.jobs.activeOrder
    return options.compareSort(a, b, sort, order)
  }

  const sortedJobs = computed(() => {
    // https://vuejs.org/guide/essentials/list.html#displaying-filtered-sorted-results
    const result = [...jobsList.value].filter(options.match)
    return result.sort(compareJob)
  })

  const lastpage = computed(() => Math.max(Math.ceil(sortedJobs.value.length / JOBS_PAGE_SIZE), 1))
  const firstjob = computed(() => (runtimeStore.jobs.page - 1) * JOBS_PAGE_SIZE)
  const lastjob = computed(() => Math.min(firstjob.value + JOBS_PAGE_SIZE, sortedJobs.value.length))

  function jobsPages(): JobsListPage[] {
    const result: JobsListPage[] = []
    let ellipsis = false
    const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
    range(1, lastpage.value, 1).forEach((page) => {
      if (
        page < 3 ||
        page > lastpage.value - 2 ||
        (page >= runtimeStore.jobs.page - 1 && page <= runtimeStore.jobs.page + 1)
      ) {
        ellipsis = false
        result.push({ id: page, ellipsis: false })
      } else if (ellipsis === false) {
        ellipsis = true
        result.push({ id: page, ellipsis: true })
      }
    })
    return result
  }

  return {
    sortedJobs,
    lastpage,
    firstjob,
    lastjob,
    jobsPages
  }
}
