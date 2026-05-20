import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OidcCallbackView from '@/views/OidcCallbackView.vue'
import { init_plugins } from '../lib/common'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { AuthenticationError } from '@/composables/HTTPErrors'

const mockGatewayAPI = {
  oidcSession: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

let router

describe('OidcCallbackView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    mockGatewayAPI.oidcSession.mockReset()
    vi.mocked(router.replace).mockClear()
  })

  test('reads session and logs in user', async () => {
    mockGatewayAPI.oidcSession.mockResolvedValueOnce({
      login: 'alice',
      fullname: 'Alice User',
      token: 'SECRET-TOKEN',
      groups: ['admins']
    })

    mount(OidcCallbackView)
    await flushPromises()

    const authStore = useAuthStore()
    expect(mockGatewayAPI.oidcSession).toHaveBeenCalled()
    expect(authStore.login).toHaveBeenCalled()
    expect(authStore.username).toBe('alice')
    authStore.logout()
  })

  test('reports authentication error on failed session', async () => {
    mockGatewayAPI.oidcSession.mockImplementationOnce(() => {
      throw new AuthenticationError('OIDC login session not found')
    })

    mount(OidcCallbackView)
    await flushPromises()

    const runtimeStore = useRuntimeStore()
    expect(runtimeStore.reportError).toHaveBeenCalledWith(
      'Authentication error: OIDC login session not found'
    )
    expect(router.replace).toHaveBeenCalledWith({ name: 'login' })
  })
})
