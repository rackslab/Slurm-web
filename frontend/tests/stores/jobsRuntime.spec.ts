import { describe, test, beforeEach, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ClusterAcctJob, ClusterJob } from '@/composables/GatewayAPI'
import {
  ACTIVE_JOB_STATE_FILTERS,
  jobStateFilters,
  PAST_JOBS_DEFAULT_HOURS,
  PAST_JOBS_DEFAULT_ORDER,
  PAST_JOBS_DEFAULT_SORT,
  PAST_JOB_STATE_FILTERS,
  useJobsRuntimeStore
} from '@/stores/runtime/jobs'

const activeJob: ClusterJob = {
  job_id: 1,
  user_name: 'alice',
  account: 'physics',
  partition: 'normal',
  qos: 'low',
  job_state: ['RUNNING']
} as ClusterJob

const pastJob: ClusterAcctJob = {
  job_id: 2,
  user: 'bob',
  account: 'chemistry',
  partition: 'gpu',
  qos: 'high',
  state: { current: ['COMPLETED'], reason: 'None' }
} as ClusterAcctJob

describe('stores/runtime/jobs.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('initial state uses defaults', () => {
    const store = useJobsRuntimeStore()
    expect(store.pastHours).toBe(PAST_JOBS_DEFAULT_HOURS)
    expect(store.activeSort).toBe('id')
    expect(store.activeOrder).toBe('asc')
    expect(store.pastSort).toBe(PAST_JOBS_DEFAULT_SORT)
    expect(store.pastOrder).toBe(PAST_JOBS_DEFAULT_ORDER)
    expect(store.page).toBe(1)
    expect(store.openFiltersPanel).toBe(false)
    expect(store.filters).toEqual({
      activeStates: [],
      pastStates: [],
      users: [],
      accounts: [],
      qos: [],
      partitions: []
    })
  })

  test('jobStateFilters returns active or past state options', () => {
    expect(jobStateFilters(false)).toBe(ACTIVE_JOB_STATE_FILTERS)
    expect(jobStateFilters(true)).toBe(PAST_JOB_STATE_FILTERS)
  })

  test('isValidSortOrder and isValidSortCriterion', () => {
    const store = useJobsRuntimeStore()
    expect(store.isValidSortOrder('asc')).toBe(true)
    expect(store.isValidSortOrder('desc')).toBe(true)
    expect(store.isValidSortOrder('up')).toBe(false)
    expect(store.isValidSortCriterion('end')).toBe(true)
    expect(store.isValidSortCriterion('invalid')).toBe(false)
  })

  test('restoreSortDefault resets active sort to id', () => {
    const store = useJobsRuntimeStore()
    store.activeSort = 'user'
    store.restoreSortDefault()
    expect(store.activeSort).toBe('id')
  })

  test('remove filter helpers drop a single value', () => {
    const store = useJobsRuntimeStore()
    store.filters.activeStates = ['running', 'pending']
    store.filters.pastStates = ['completed']
    store.filters.users = ['alice', 'bob']
    store.filters.accounts = ['physics']
    store.filters.qos = ['low']
    store.filters.partitions = ['normal', 'gpu']

    store.removeActiveStateFilter('running')
    store.removePastStateFilter('completed')
    store.removeUserFilter('alice')
    store.removeAccountFilter('physics')
    store.removeQosFilter('low')
    store.removePartitionFilter('normal')

    expect(store.filters.activeStates).toEqual(['pending'])
    expect(store.filters.pastStates).toEqual([])
    expect(store.filters.users).toEqual(['bob'])
    expect(store.filters.accounts).toEqual([])
    expect(store.filters.qos).toEqual([])
    expect(store.filters.partitions).toEqual(['gpu'])
  })

  test('emptyFilters distinguishes active and past state lists', () => {
    const store = useJobsRuntimeStore()
    expect(store.emptyFilters(false)).toBe(true)
    expect(store.emptyFilters(true)).toBe(true)

    store.filters.activeStates = ['running']
    expect(store.emptyFilters(false)).toBe(false)
    expect(store.emptyFilters(true)).toBe(true)

    store.filters.activeStates = []
    store.filters.pastStates = ['completed']
    expect(store.emptyFilters(false)).toBe(true)
    expect(store.emptyFilters(true)).toBe(false)

    store.filters.users = ['alice']
    expect(store.emptyFilters(true)).toBe(false)
  })

  describe('matchesFilters', () => {
    test('matches all jobs when active filters are empty', () => {
      const store = useJobsRuntimeStore()
      expect(store.matchesFilters(activeJob)).toBe(true)
    })

    test('filters by state, user, account, qos, and partition', () => {
      const store = useJobsRuntimeStore()
      store.filters.activeStates = ['running']
      store.filters.users = ['alice']
      store.filters.accounts = ['physics']
      store.filters.qos = ['low']
      store.filters.partitions = ['normal']

      expect(store.matchesFilters(activeJob)).toBe(true)
      expect(
        store.matchesFilters({ ...activeJob, job_state: ['PENDING'] } as ClusterJob)
      ).toBe(false)
      expect(store.matchesFilters({ ...activeJob, user_name: 'bob' } as ClusterJob)).toBe(
        false
      )
      expect(store.matchesFilters({ ...activeJob, account: 'other' } as ClusterJob)).toBe(
        false
      )
      expect(store.matchesFilters({ ...activeJob, qos: 'high' } as ClusterJob)).toBe(false)
      expect(
        store.matchesFilters({ ...activeJob, partition: 'interactive' } as ClusterJob)
      ).toBe(false)
    })

    test('state and user matching is case-insensitive', () => {
      const store = useJobsRuntimeStore()
      store.filters.activeStates = ['running']
      store.filters.users = ['ALICE']

      expect(
        store.matchesFilters({ ...activeJob, job_state: ['Running'] } as ClusterJob)
      ).toBe(true)
      expect(store.matchesFilters({ ...activeJob, user_name: 'Alice' } as ClusterJob)).toBe(
        true
      )
    })
  })

  describe('matchesAcctJobFilters', () => {
    test('matches all jobs when past filters are empty', () => {
      const store = useJobsRuntimeStore()
      expect(store.matchesAcctJobFilters(pastJob)).toBe(true)
    })

    test('filters by past state and shared dimensions', () => {
      const store = useJobsRuntimeStore()
      store.filters.pastStates = ['completed']
      store.filters.users = ['bob']
      store.filters.accounts = ['chemistry']
      store.filters.qos = ['high']
      store.filters.partitions = ['gpu']

      expect(store.matchesAcctJobFilters(pastJob)).toBe(true)
      expect(
        store.matchesAcctJobFilters({
          ...pastJob,
          state: { current: ['FAILED'], reason: 'None' }
        } as ClusterAcctJob)
      ).toBe(false)
      expect(store.matchesAcctJobFilters({ ...pastJob, user: 'alice' } as ClusterAcctJob)).toBe(
        false
      )
    })

    test('active state filters do not affect past job matching', () => {
      const store = useJobsRuntimeStore()
      store.filters.activeStates = ['pending']
      expect(store.matchesAcctJobFilters(pastJob)).toBe(true)
    })
  })

  describe('query', () => {
    test('omits default active list parameters', () => {
      const store = useJobsRuntimeStore()
      expect(store.query()).toEqual({})
    })

    test('serializes non-default active list settings and filters', () => {
      const store = useJobsRuntimeStore()
      store.page = 2
      store.activeSort = 'state'
      store.activeOrder = 'desc'
      store.filters.activeStates = ['running', 'pending']
      store.filters.users = ['alice']
      store.filters.accounts = ['physics']
      store.filters.qos = ['low']
      store.filters.partitions = ['normal', 'gpu']

      expect(store.query()).toEqual({
        page: 2,
        sort: 'state',
        order: 'desc',
        states: 'running,pending',
        users: 'alice',
        accounts: 'physics',
        qos: 'low',
        partitions: 'normal,gpu'
      })
    })
  })

  describe('pastQuery', () => {
    test('omits default past list parameters', () => {
      const store = useJobsRuntimeStore()
      expect(store.pastQuery()).toEqual({})
    })

    test('serializes non-default past list settings and filters', () => {
      const store = useJobsRuntimeStore()
      store.page = 3
      store.pastHours = 24
      store.pastSort = 'user'
      store.pastOrder = 'asc'
      store.filters.pastStates = ['completed']
      store.filters.users = ['bob']

      expect(store.pastQuery()).toEqual({
        page: 3,
        past_hours: 24,
        sort: 'user',
        order: 'asc',
        states: 'completed',
        users: 'bob'
      })
    })
  })

  describe('pastHoursPresets', () => {
    test('returns presets up to maxHours', () => {
      const store = useJobsRuntimeStore()
      expect(store.pastHoursPresets(24)).toEqual([1, 6, 12, 24])
      expect(store.pastHoursPresets(12)).toEqual([1, 6, 12])
    })

    test('includes defaultHours when missing from standard presets', () => {
      const store = useJobsRuntimeStore()
      expect(store.pastHoursPresets(168, 72)).toEqual([1, 6, 12, 24, 48, 72, 168])
    })

    test('does not duplicate defaultHours already in presets', () => {
      const store = useJobsRuntimeStore()
      expect(store.pastHoursPresets(168, 24)).toEqual([1, 6, 12, 24, 48, 168])
    })

    test('ignores defaultHours above maxHours', () => {
      const store = useJobsRuntimeStore()
      expect(store.pastHoursPresets(12, 72)).toEqual([1, 6, 12])
    })
  })
})
