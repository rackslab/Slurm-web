import { describe, expect, test } from 'vitest'
import { representDuration } from '@/composables/TimeDuration'

describe('TimeDuration', () => {
  test('representation duration with 2 unset numbers', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: false },
        { infinite: false, number: 0, set: false }
      )
    ).toBe('-')
  })
  test('representation duration with 1 unset number', () => {
    expect(
      representDuration(
        { infinite: false, number: 1, set: true },
        { infinite: false, number: 0, set: false }
      )
    ).toBe('-')
    expect(
      representDuration(
        { infinite: false, number: 0, set: false },
        { infinite: false, number: 1, set: true }
      )
    ).toBe('-')
  })
  test('representation duration with 1 second', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 1, set: true }
      )
    ).toBe('1 second')
  })
  test('representation duration with some seconds', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 10, set: true }
      )
    ).toBe('10 seconds')
  })
  test('representation duration with 1 minute', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 60, set: true }
      )
    ).toBe('1 minute')
  })
  test('representation duration some minutes and seconds', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 323, set: true }
      )
    ).toBe('5 minutes 23 seconds')
  })
  test('representation duration with 1 hour', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 3600, set: true }
      )
    ).toBe('1 hour')
  })
  test('representation duration some hours, minutes and seconds', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 8500, set: true }
      )
    ).toBe('2 hours 21 minutes 40 seconds')
  })
  test('representation duration with 1 day', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 86400, set: true }
      )
    ).toBe('1 day')
  })
  test('representation duration some days, hours, minutes and seconds', () => {
    expect(
      representDuration(
        { infinite: false, number: 0, set: true },
        { infinite: false, number: 275000, set: true }
      )
    ).toBe('3 days 4 hours 23 minutes 20 seconds')
  })
})
