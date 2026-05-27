import { describe, test, expect, beforeEach, vi } from 'vitest'
import { shallowMount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LoginView from '@/views/LoginView.vue'
import { init_plugins } from '../lib/common'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { AuthenticationError } from '@/composables/HTTPErrors'
import LoginServiceMessage from '@/components/login/LoginServiceMessage.vue'
import InfoAlert from '@/components/InfoAlert.vue'

const mockGatewayAPI = {
  login: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

let router

describe('LoginView.vue', () => {
  describe('LDAP mode', () => {
    beforeEach(() => {
      router = init_plugins({ authentication_method: 'ldap' })
      mockGatewayAPI.login.mockReset()
    })

    test('should display custom logo when configured', () => {
      init_plugins({
        authentication_method: 'ldap',
        logo: { login: '/gateway/logo/brand_login.png', alt: 'Portal' }
      })
      const wrapper = shallowMount(LoginView, {})
      const image = wrapper.get('img')
      expect(image.attributes('src')).toContain('/gateway/logo/brand_login.png')
      expect(image.attributes('alt')).toBe('Portal')
    })

    test('should display login form', () => {
      const wrapper = shallowMount(LoginView, {})
      const image = wrapper.get('img')
      expect(image.attributes('src')).toContain('/logo/slurm-web_logo.png')
      wrapper.get('input#user')
      wrapper.get('input#password')
      const button = wrapper.get('button')
      expect(button.attributes('type')).toBe('submit')
      wrapper.getComponent(LoginServiceMessage)
      expect(wrapper.findComponent(InfoAlert).exists()).toBe(false)
    })

    test('error on login form submission with empty user input', async () => {
      const wrapper = shallowMount(LoginView, {})
      const button = wrapper.get('button')
      const user_input = wrapper.get('input#user')
      const password_input = wrapper.get('input#password')
      await button.trigger('submit')
      expect(user_input.classes('bg-red-200')).toBe(true)
      expect(password_input.classes('bg-gray-50')).toBe(true)
    })

    test('error on login form submission with empty password input', async () => {
      const wrapper = shallowMount(LoginView, {})
      const button = wrapper.get('button')
      const user_input = wrapper.get('input#user')
      user_input.setValue('user')
      const password_input = wrapper.get('input#password')
      await button.trigger('submit')
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
      const wrapper = shallowMount(LoginView, {})
      await wrapper.get('input#user').setValue('jdoe')
      await wrapper.get('input#password').setValue('secret')
      await wrapper.get('button').trigger('submit')
      const authStore = useAuthStore()
      expect(authStore.login).toHaveBeenCalled()
      expect(authStore.username).toBe('jdoe')
      expect(authStore.token).toBe('SECRET-TOKEN')
      expect(authStore.groups).toStrictEqual(['scientists'])
      expect(router.push).toHaveBeenCalledTimes(1)
      expect(router.push).toHaveBeenCalledWith({ name: 'clusters' })
      authStore.logout()
    })

    test('authentication failed', async () => {
      mockGatewayAPI.login.mockImplementationOnce(() => {
        throw new AuthenticationError('invalid password')
      })
      const wrapper = shallowMount(LoginView, {})
      await wrapper.get('input#user').setValue('jdoe')
      await wrapper.get('input#password').setValue('secret')
      await wrapper.get('button').trigger('submit')
      const authStore = useAuthStore()
      expect(authStore.login).not.toHaveBeenCalled()
      expect(authStore.username).toBe(null)
      const runtimeStore = useRuntimeStore()
      expect(runtimeStore.reportError).toHaveBeenCalledWith(
        'Authentication error: invalid password'
      )
      expect(wrapper.get('button').classes('animate-horizontal-shake')).toBe(true)
      expect(router.push).toHaveBeenCalledTimes(0)
    })

    test('should display info alert when redirected to login page', async () => {
      const wrapper = mount(LoginView, {})
      const authStore = useAuthStore()
      authStore.returnUrl = '/clusters/foo/dashboard'
      await nextTick()
      const infoAlert = wrapper.getComponent(InfoAlert)
      expect(infoAlert.text()).toBe('Please log in to access the requested page.')
      authStore.returnUrl = null
    })
  })

  describe('OIDC mode', () => {
    beforeEach(() => {
      init_plugins({ authentication_method: 'oidc' })
    })

    test('should display OpenID sign-in link', () => {
      const wrapper = shallowMount(LoginView, {})
      expect(wrapper.find('input#user').exists()).toBe(false)
      expect(wrapper.find('form').exists()).toBe(false)
      const openIdLink = wrapper.get('a')
      expect(openIdLink.text()).toBe('Sign in with OpenID')
      expect(openIdLink.attributes('href')).toBe('http://localhost/api/oidc/login')
    })
  })
})
