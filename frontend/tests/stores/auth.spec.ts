import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('setSession persists state and localStorage', () => {
    const auth = useAuthStore()
    auth.setSession('token-1', 'jdoe', 'John Doe', ['scientists'])

    expect(auth.token).toBe('token-1')
    expect(auth.username).toBe('jdoe')
    expect(auth.fullname).toBe('John Doe')
    expect(auth.groups).toStrictEqual(['scientists'])
    expect(localStorage.getItem('token')).toBe('token-1')
    expect(localStorage.getItem('username')).toBe('jdoe')
    expect(localStorage.getItem('fullname')).toBe('John Doe')
    expect(localStorage.getItem('groups')).toBe(JSON.stringify(['scientists']))
  })

  test('takePostLoginRoute returns default and clears returnUrl', () => {
    const auth = useAuthStore()
    auth.returnUrl = '/clusters/foo/dashboard'

    expect(auth.takePostLoginRoute()).toBe('/clusters/foo/dashboard')
    expect(auth.returnUrl).toBe(null)
  })

  test('takePostLoginRoute defaults to clusters when returnUrl is unset', () => {
    const auth = useAuthStore()

    expect(auth.takePostLoginRoute()).toEqual({ name: 'clusters' })
    expect(auth.returnUrl).toBe(null)
  })

  test('logout clears token from state and localStorage', () => {
    const auth = useAuthStore()
    auth.setSession('token-1', 'jdoe', 'John Doe', ['scientists'])

    auth.logout()

    expect(auth.token).toBe(null)
    expect(localStorage.getItem('token')).toBe(null)
    expect(localStorage.getItem('username')).toBe(null)
    expect(localStorage.getItem('fullname')).toBe(null)
    expect(localStorage.getItem('groups')).toBe(null)
  })
})
