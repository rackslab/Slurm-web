import { describe, test, expect, beforeEach } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import SignoutView from '@/views/SignoutView.vue'
import { init_plugins } from '../lib/common'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import type { RouterMock } from 'vue-router-mock'

let router: RouterMock

describe('SignoutView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    // Set default current route
    router.currentRoute.value.fullPath = '/test-route'
  })

  test('basic signout flow', async () => {
    shallowMount(SignoutView)
    await flushPromises()

    // Check that logout was called
    expect(useAuthStore().logout).toHaveBeenCalled()

    // Check that info message was reported
    expect(useRuntimeStore().reportInfo).toHaveBeenCalledWith('You have been signed out')

    // Check redirect to login
    expect(router.push).toHaveBeenCalledWith({ name: 'login' })
  })
})
