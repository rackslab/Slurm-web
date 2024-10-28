import { describe, test, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LoginServiceMessage from '@/components/login/LoginServiceMessage.vue'
import messageLoginNotFound from '../../assets/message_login_not_found.json'
import messageLoginError from '../../assets/message_login_error.json'
import { init_plugins } from '../../views/common'
import { APIServerError } from '@/composables/HTTPErrors'
import { useRuntimeStore } from '@/stores/runtime'

const fs = require('fs')
const path = require('path')

const mockGatewayAPI = {
  message_login: vi.fn()
} as { message_login: () => string }

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

describe('LoginServiceMessageView.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('display login service message', async () => {
    const message = fs
      .readFileSync(path.resolve(__dirname, '../../assets/message_login.txt'))
      .toString()
    mockGatewayAPI.message_login = () => message
    const wrapper = mount(LoginServiceMessage)
    await flushPromises()
    // Check there is an iframe with expected message
    expect(wrapper.get('iframe').attributes('srcdoc')).toBe(message)
  })
  test('ignore login message not found', async () => {
    mockGatewayAPI.message_login = () => {
      throw new APIServerError(messageLoginNotFound.code, messageLoginNotFound.description)
    }
    const wrapper = mount(LoginServiceMessage)
    const runtimeStore = useRuntimeStore()
    // Check error has not been reported
    expect(runtimeStore.reportError).not.toHaveBeenCalled()
    // Check the iframe is not present in DOM
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
  test('show login message error', async () => {
    mockGatewayAPI.message_login = () => {
      throw new APIServerError(messageLoginError.code, messageLoginError.description)
    }
    const wrapper = mount(LoginServiceMessage)
    const runtimeStore = useRuntimeStore()
    // Check error has been reported
    expect(runtimeStore.reportError).toHaveBeenCalled()
    // Check the iframe is not present in DOM
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
})
