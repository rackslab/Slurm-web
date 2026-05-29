import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useJobsPageQuery } from '@/composables/jobs/JobsPageQuery'
import { useRuntimeStore } from '@/stores/runtime'
import {
  PAST_JOBS_DEFAULT_HOURS,
  PAST_JOBS_DEFAULT_ORDER,
  PAST_JOBS_DEFAULT_SORT
} from '@/stores/runtime/jobs'
import { init_plugins } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => router.currentRoute.value
}))

function mountJobsPageQuery(routeName: 'jobs' | 'jobs-past') {
  let api!: ReturnType<typeof useJobsPageQuery>
  const Wrapper = defineComponent({
    setup() {
      api = useJobsPageQuery(routeName)
      return () => null
    }
  })
  mount(Wrapper)
  return api
}

describe('useJobsPageQuery', () => {
  beforeEach(() => {
    router = init_plugins()
    Object.assign(router.currentRoute.value, {
      name: 'jobs',
      query: {} as Record<string, string>
    })

    const runtime = useRuntimeStore()
    runtime.jobs.page = 1
    runtime.jobs.activeSort = 'id'
    runtime.jobs.activeOrder = 'asc'
    runtime.jobs.pastSort = PAST_JOBS_DEFAULT_SORT
    runtime.jobs.pastOrder = PAST_JOBS_DEFAULT_ORDER
    runtime.jobs.pastHours = PAST_JOBS_DEFAULT_HOURS
    runtime.jobs.filters.activeStates = []
    runtime.jobs.filters.pastStates = []
    runtime.jobs.filters.users = []
    runtime.jobs.filters.accounts = []
    runtime.jobs.filters.qos = []
    runtime.jobs.filters.partitions = []
    runtime.currentCluster = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: false,
      metrics: false,
      cache: false,
      permissions: { roles: [], actions: [] },
      slurmdbd: { jobs_max_hours: 48 }
    }
    vi.mocked(router.push).mockClear()
  })

  describe('syncFiltersFromRoute', () => {
    test('syncs active jobs filters from route query', () => {
      router.currentRoute.value.query = {
        sort: 'user',
        order: 'desc',
        page: '3',
        states: 'running,pending',
        users: 'alice,bob',
        accounts: 'proj',
        qos: 'normal',
        partitions: 'gpu'
      }

      const { syncFiltersFromRoute } = mountJobsPageQuery('jobs')
      syncFiltersFromRoute()

      const runtime = useRuntimeStore()
      expect(runtime.jobs.activeSort).toBe('user')
      expect(runtime.jobs.activeOrder).toBe('desc')
      expect(runtime.jobs.page).toBe(3)
      expect(runtime.jobs.filters.activeStates).toEqual(['running', 'pending'])
      expect(runtime.jobs.filters.users).toEqual(['alice', 'bob'])
      expect(runtime.jobs.filters.accounts).toEqual(['proj'])
      expect(runtime.jobs.filters.qos).toEqual(['normal'])
      expect(runtime.jobs.filters.partitions).toEqual(['gpu'])
    })

    test('syncs past jobs filters and clamps past_hours', () => {
      router.currentRoute.value.name = 'jobs-past'
      router.currentRoute.value.query = {
        sort: 'end',
        order: 'asc',
        states: 'completed',
        past_hours: '999'
      }

      const { syncFiltersFromRoute } = mountJobsPageQuery('jobs-past')
      syncFiltersFromRoute()

      const runtime = useRuntimeStore()
      expect(runtime.jobs.pastSort).toBe('end')
      expect(runtime.jobs.pastOrder).toBe('asc')
      expect(runtime.jobs.filters.pastStates).toEqual(['completed'])
      expect(runtime.jobs.pastHours).toBe(48)
    })

    test('uses default past_hours when query is missing or invalid', () => {
      router.currentRoute.value.query = { past_hours: 'not-a-number' }

      const { syncFiltersFromRoute } = mountJobsPageQuery('jobs-past')
      syncFiltersFromRoute()

      expect(useRuntimeStore().jobs.pastHours).toBe(PAST_JOBS_DEFAULT_HOURS)
    })

    test('ignores invalid sort and order values', () => {
      router.currentRoute.value.query = {
        sort: 'invalid',
        order: 'sideways'
      }

      const { syncFiltersFromRoute } = mountJobsPageQuery('jobs')
      syncFiltersFromRoute()

      const runtime = useRuntimeStore()
      expect(runtime.jobs.activeSort).toBe('id')
      expect(runtime.jobs.activeOrder).toBe('asc')
    })

    test('resets filters before applying route query', () => {
      const runtime = useRuntimeStore()
      runtime.jobs.filters.users = ['stale']
      runtime.jobs.filters.activeStates = ['running']
      router.currentRoute.value.query = {}

      const { syncFiltersFromRoute } = mountJobsPageQuery('jobs')
      syncFiltersFromRoute()

      expect(runtime.jobs.filters.users).toEqual([])
      expect(runtime.jobs.filters.activeStates).toEqual([])
    })
  })

  describe('updateQueryParameters', () => {
    test('pushes active jobs query built from the store', () => {
      const runtime = useRuntimeStore()
      runtime.jobs.activeSort = 'user'
      runtime.jobs.activeOrder = 'desc'
      runtime.jobs.page = 2
      runtime.jobs.filters.activeStates = ['running']
      runtime.jobs.filters.users = ['alice']

      const { updateQueryParameters } = mountJobsPageQuery('jobs')
      updateQueryParameters()

      expect(router.push).toHaveBeenCalledWith({
        name: 'jobs',
        query: {
          sort: 'user',
          order: 'desc',
          page: 2,
          states: 'running',
          users: 'alice'
        }
      })
    })

    test('pushes past jobs query built from the store', () => {
      const runtime = useRuntimeStore()
      runtime.jobs.pastHours = 24
      runtime.jobs.filters.pastStates = ['failed']

      const { updateQueryParameters } = mountJobsPageQuery('jobs-past')
      updateQueryParameters()

      expect(router.push).toHaveBeenCalledWith({
        name: 'jobs-past',
        query: {
          past_hours: 24,
          states: 'failed'
        }
      })
    })
  })

  describe('setupFilterQuerySync', () => {
    test('syncs from route when query parameters are present', () => {
      router.currentRoute.value.query = { users: 'alice' }

      const { setupFilterQuerySync } = mountJobsPageQuery('jobs')
      setupFilterQuerySync()

      expect(useRuntimeStore().jobs.filters.users).toEqual(['alice'])
      expect(router.push).not.toHaveBeenCalled()
    })

    test('pushes store query when route has no recognized parameters', () => {
      router.currentRoute.value.query = {}

      const { setupFilterQuerySync } = mountJobsPageQuery('jobs')
      setupFilterQuerySync()

      expect(router.push).toHaveBeenCalledWith({
        name: 'jobs',
        query: {}
      })
    })

    test('updates route when a watched filter changes', async () => {
      const { setupFilterQuerySync } = mountJobsPageQuery('jobs')
      setupFilterQuerySync()
      vi.mocked(router.push).mockClear()

      useRuntimeStore().jobs.filters.users = ['bob']
      await flushPromises()

      expect(router.push).toHaveBeenCalledWith({
        name: 'jobs',
        query: { users: 'bob' }
      })
    })

    test('updates route when page changes', async () => {
      const { setupFilterQuerySync } = mountJobsPageQuery('jobs')
      setupFilterQuerySync()
      vi.mocked(router.push).mockClear()

      useRuntimeStore().jobs.page = 2
      await flushPromises()

      expect(router.push).toHaveBeenCalledWith({
        name: 'jobs',
        query: { page: 2 }
      })
    })

    test('watches pastStates for jobs-past route', async () => {
      const { setupFilterQuerySync } = mountJobsPageQuery('jobs-past')
      setupFilterQuerySync()
      vi.mocked(router.push).mockClear()

      useRuntimeStore().jobs.filters.pastStates = ['timeout']
      await flushPromises()

      expect(router.push).toHaveBeenCalledWith({
        name: 'jobs-past',
        query: { states: 'timeout' }
      })
    })
  })
})
