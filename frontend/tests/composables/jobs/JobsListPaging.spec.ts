import { beforeEach, describe, expect, test } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useJobsListPaging } from '@/composables/jobs/JobsListPaging'
import type { JobsListPagingOptions } from '@/composables/jobs/JobsListPaging'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins } from '../../lib/common'
import type { JobSortCriterion, JobSortOrder } from '@/stores/runtime/jobs'

interface TestJob {
  id: number
  user: string
}

function mountJobsListPaging(
  jobs: TestJob[],
  options: Partial<JobsListPagingOptions<TestJob>> = {}
) {
  const jobsList = ref([...jobs])
  const match = options.match ?? (() => true)
  const compareSort =
    options.compareSort ??
    ((a, b, sort, order) => {
      const field = sort === 'user' ? 'user' : 'id'
      const av = a[field]
      const bv = b[field]
      if (av === bv) return 0
      return order === 'asc' ? (av > bv ? 1 : -1) : av > bv ? -1 : 1
    })

  let paging!: ReturnType<typeof useJobsListPaging<TestJob>>
  const Wrapper = defineComponent({
    setup() {
      paging = useJobsListPaging(jobsList, {
        match,
        compareSort,
        past: options.past
      })
      return () => null
    }
  })

  mount(Wrapper)
  return { paging, jobsList }
}

describe('useJobsListPaging', () => {
  beforeEach(() => {
    init_plugins()
    const runtime = useRuntimeStore()
    runtime.jobs.page = 1
    runtime.jobs.activeSort = 'id'
    runtime.jobs.activeOrder = 'asc'
    runtime.jobs.pastSort = 'end'
    runtime.jobs.pastOrder = 'desc'
  })

  test('sortedJobs filters and sorts with active sort settings', () => {
    const { paging } = mountJobsListPaging(
      [
        { id: 3, user: 'bob' },
        { id: 1, user: 'alice' },
        { id: 2, user: 'carol' }
      ],
      { match: (job) => job.id !== 2 }
    )

    expect(paging.sortedJobs.value.map((job) => job.id)).toEqual([1, 3])
  })

  test('sortedJobs uses pastSort and pastOrder when past option is set', () => {
    const runtime = useRuntimeStore()
    runtime.jobs.pastSort = 'user'
    runtime.jobs.pastOrder = 'asc'
    runtime.jobs.activeSort = 'id'
    runtime.jobs.activeOrder = 'desc'

    const { paging } = mountJobsListPaging(
      [
        { id: 1, user: 'bob' },
        { id: 2, user: 'alice' }
      ],
      { past: true }
    )

    expect(paging.sortedJobs.value.map((job) => job.user)).toEqual(['alice', 'bob'])
  })

  test('lastpage is at least 1 for an empty list', () => {
    const { paging } = mountJobsListPaging([])
    expect(paging.lastpage.value).toBe(1)
  })

  test('lastpage and slice indices follow page size of 100', () => {
    const runtime = useRuntimeStore()
    runtime.jobs.page = 2
    const jobs = Array.from({ length: 150 }, (_, index) => ({
      id: index + 1,
      user: 'alice'
    }))
    const { paging } = mountJobsListPaging(jobs)

    expect(paging.lastpage.value).toBe(2)
    expect(paging.firstjob.value).toBe(100)
    expect(paging.lastjob.value).toBe(150)
  })

  test('jobsPages shows all pages when there are few pages', () => {
    const { paging } = mountJobsListPaging(
      Array.from({ length: 200 }, (_, index) => ({ id: index + 1, user: 'alice' }))
    )

    expect(paging.jobsPages()).toEqual([
      { id: 1, ellipsis: false },
      { id: 2, ellipsis: false }
    ])
  })

  test('jobsPages inserts ellipsis for distant pages', () => {
    const runtime = useRuntimeStore()
    runtime.jobs.page = 5
    const jobs = Array.from({ length: 1000 }, (_, index) => ({
      id: index + 1,
      user: 'alice'
    }))
    const { paging } = mountJobsListPaging(jobs)
    const pages = paging.jobsPages()

    expect(pages[0]).toEqual({ id: 1, ellipsis: false })
    expect(pages[1]).toEqual({ id: 2, ellipsis: false })
    expect(pages.some((page) => page.ellipsis)).toBe(true)
    expect(pages[pages.length - 1]).toEqual({ id: 10, ellipsis: false })
    expect(pages[pages.length - 2]).toEqual({ id: 9, ellipsis: false })
  })

  test('compareSort receives sort and order from the store', () => {
    const runtime = useRuntimeStore()
    runtime.jobs.activeSort = 'user' as JobSortCriterion
    runtime.jobs.activeOrder = 'desc' as JobSortOrder

    const received: Array<{ sort: JobSortCriterion; order: JobSortOrder }> = []
    const { paging } = mountJobsListPaging(
      [
        { id: 1, user: 'a' },
        { id: 2, user: 'b' }
      ],
      {
        compareSort: (_a, _b, sort, order) => {
          received.push({ sort, order })
          return 0
        }
      }
    )
    expect(paging.sortedJobs.value).toHaveLength(2)

    expect(received.length).toBeGreaterThan(0)
    expect(received.every((entry) => entry.sort === 'user' && entry.order === 'desc')).toBe(true)
  })
})
