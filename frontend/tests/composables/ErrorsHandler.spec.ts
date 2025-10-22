import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useErrorsHandler } from '@/composables/ErrorsHandler'
import { AuthenticationError, PermissionError } from '@/composables/HTTPErrors'
import { init_plugins } from '../lib/common'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

vi.mock('vue-router', () => ({
  useRouter: () => router
}))

describe('useErrorsHandler', () => {
  beforeEach(() => {
    router = init_plugins()
    // Set current route to /test-route for testing
    router.currentRoute.value.fullPath = '/test-route'
  })

  test('reportAuthenticationError sets returnUrl and redirects to signout', () => {
    const { reportAuthenticationError } = useErrorsHandler()
    const error = new AuthenticationError('Test authentication error')

    reportAuthenticationError(error)

    // Check that returnUrl was set to current route
    expect(useAuthStore().returnUrl).toBe('/test-route')

    // Check redirect to signout
    expect(router.push).toHaveBeenCalledWith({ name: 'signout' })
  })

  test('reportAuthenticationError reports error to runtime store', () => {
    const { reportAuthenticationError } = useErrorsHandler()
    const error = new AuthenticationError('Test authentication error')

    reportAuthenticationError(error)

    // Check that error was reported to runtime store
    expect(useRuntimeStore().reportError).toHaveBeenCalledWith(
      'Authentication error: Test authentication error'
    )
  })

  test('reportPermissionError reports error to runtime store', () => {
    const { reportPermissionError } = useErrorsHandler()
    const error = new PermissionError('Test permission error')

    reportPermissionError(error)

    // Check that error was reported to runtime store
    expect(useRuntimeStore().reportError).toHaveBeenCalledWith(
      'Permission error: Test permission error'
    )
  })

  test('reportServerError reports error to runtime store', () => {
    const { reportServerError } = useErrorsHandler()
    const error = new Error('Test server error')

    reportServerError(error)

    // Check that error was reported to runtime store
    expect(useRuntimeStore().reportError).toHaveBeenCalledWith('Server error: Test server error')
  })
})
