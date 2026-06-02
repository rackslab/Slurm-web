import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuthSession } from '@/composables/AuthSession'
import { init_plugins } from '../lib/common'
import { useAuthStore } from '@/stores/auth'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

vi.mock('vue-router', () => ({
  useRouter: () => router
}))

describe('useAuthSession', () => {
  beforeEach(() => {
    router = init_plugins()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('login persists session and redirects to clusters by default', async () => {
    const { login } = useAuthSession()
    const authStore = useAuthStore()

    await login('token-1', 'jdoe', 'John Doe', ['scientists'])

    expect(authStore.setSession).toHaveBeenCalledWith('token-1', 'jdoe', 'John Doe', ['scientists'])
    expect(authStore.token).toBe('token-1')
    expect(router.push).toHaveBeenCalledWith({ name: 'clusters' })
    expect(authStore.returnUrl).toBe(null)
  })

  test('login redirects to returnUrl when set', async () => {
    const authStore = useAuthStore()
    authStore.returnUrl = '/clusters/foo/dashboard'
    const { login } = useAuthSession()

    await login('token-1', 'jdoe', 'John Doe', [])

    expect(router.push).toHaveBeenCalledWith('/clusters/foo/dashboard')
    expect(authStore.returnUrl).toBe(null)
  })

  test('anonymousLogin uses anonymous credentials', async () => {
    const { anonymousLogin } = useAuthSession()
    const authStore = useAuthStore()

    await anonymousLogin('anon-token')

    expect(authStore.username).toBe('anonymous')
    expect(authStore.fullname).toBe('anonymous')
    expect(authStore.groups).toStrictEqual([])
    expect(router.push).toHaveBeenCalledWith({ name: 'clusters' })
  })
})
