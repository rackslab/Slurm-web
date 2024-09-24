import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'
import { init_plugins } from './common'
import { useAuthStore } from '@/stores/auth'

const mockGatewayAPI = {
  login: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

let router

describe('LoginView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
  })
  test('should display login form', () => {
    const wrapper = mount(LoginView, {})
    // Check presence of the logo and its source.
    const image = wrapper.get('img')
    expect(image.attributes('src')).toBe('/logo/slurm-web_logo.png')
    // Check presence on user/password inputs.
    wrapper.get('input#user')
    wrapper.get('input#password')
    // Check presence and type of submit button.
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('submit')
  })
  test('error on login form submission with empty user input', async () => {
    const wrapper = mount(LoginView, {})
    const button = wrapper.get('button')
    const user_input = wrapper.get('input#user')
    const password_input = wrapper.get('input#password')
    await button.trigger('submit')
    // Check user input is highlighted with red background color while password
    // input is still in gray.
    expect(user_input.classes('bg-red-200')).toBe(true)
    expect(password_input.classes('bg-gray-50')).toBe(true)
  })
  test('error on login form submission with empty password input', async () => {
    const wrapper = mount(LoginView, {})
    const button = wrapper.get('button')
    // Add value in user input.
    const user_input = wrapper.get('input#user')
    user_input.setValue('user')
    const password_input = wrapper.get('input#password')
    await button.trigger('submit')
    // Check password input is highlighted with red background color while user
    // is OK.
    expect(user_input.classes('bg-gray-50')).toBe(true)
    expect(password_input.classes('bg-red-200')).toBe(true)
  })
  test('successful login submission', async () => {
    mockGatewayAPI.login.mockReturnValueOnce(
      Promise.resolve({
        login: 'jdoe',
        fullname: 'John Doe',
        token: 'SECRET-TOKEN',
        groups: ['scientists']
      })
    )
    const wrapper = mount(LoginView, {})
    // Add values in user and passwords inputs.
    await wrapper.get('input#user').setValue('jdoe')
    await wrapper.get('input#password').setValue('secret')
    // Submit login form
    await wrapper.get('button').trigger('submit')
    // Check login() method is called on authStore and user information are saved
    const authStore = useAuthStore()
    expect(authStore.login).toHaveBeenCalled()
    expect(authStore.username).toBe('jdoe')
    expect(authStore.token).toBe('SECRET-TOKEN')
    expect(authStore.groups).toStrictEqual(['scientists'])
    // Check redirect on clusters list
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({ name: 'clusters' })
  })
})
