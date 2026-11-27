import { describe, expect, test } from 'vitest'
import {
  jobMetricBytesStep,
  jobMetricFormatValue,
  jobMetricTimeUnit
} from '@/composables/charts/JobMetricLine'

describe('jobMetricTimeUnit', () => {
  test('minute up to 2 hours', () => {
    expect(jobMetricTimeUnit({ min: 0, max: 60 * 1000 })).toBe('minute')
    expect(jobMetricTimeUnit({ min: 0, max: 2 * 3600 * 1000 })).toBe('minute')
  })
  test('hour up to 3 days', () => {
    expect(jobMetricTimeUnit({ min: 0, max: 2 * 3600 * 1000 + 1 })).toBe('hour')
    expect(jobMetricTimeUnit({ min: 0, max: 3 * 86400 * 1000 })).toBe('hour')
  })
  test('day beyond', () => {
    expect(jobMetricTimeUnit({ min: 0, max: 3 * 86400 * 1000 + 1 })).toBe('day')
  })
})

describe('jobMetricFormatValue', () => {
  test('percent', () => {
    expect(jobMetricFormatValue('percent', 50)).toBe('50%')
    expect(jobMetricFormatValue('percent', 99.37007)).toBe('99.37%')
  })
  test('bytes', () => {
    expect(jobMetricFormatValue('bytes', 4 * 1024 ** 3)).toBe('4GB')
    expect(jobMetricFormatValue('bytes', 0)).toBe('0')
  })
})

describe('jobMetricBytesStep', () => {
  test('power of two step for about 6 ticks', () => {
    // 4GB max: 512MB step, 9 ticks
    expect(jobMetricBytesStep(4 * 1024 ** 3)).toBe(512 * 1024 ** 2)
    // 32GB max: 4GB step
    expect(jobMetricBytesStep(32 * 1024 ** 3)).toBe(4 * 1024 ** 3)
    // 517MB max: 64MB step
    expect(jobMetricBytesStep(542142464)).toBe(64 * 1024 ** 2)
  })
  test('small values', () => {
    expect(jobMetricBytesStep(1)).toBe(1)
  })
  test('undefined without positive max', () => {
    expect(jobMetricBytesStep(0)).toBeUndefined()
    expect(jobMetricBytesStep(-1)).toBeUndefined()
    expect(jobMetricBytesStep(NaN)).toBeUndefined()
  })
})
