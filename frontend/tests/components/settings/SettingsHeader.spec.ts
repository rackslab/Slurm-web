import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsHeader from '@/components/settings/SettingsHeader.vue'

describe('SettingsHeader.vue', () => {
  test('renders title and description', () => {
    const wrapper = mount(SettingsHeader, {
      props: {
        title: 'Test Title',
        description: 'Test description'
      }
    })
    const heading = wrapper.get('h1')
    expect(heading.text()).toBe('Test Title')

    const description = wrapper.get('p')
    expect(description.text()).toBe('Test description')
  })
})
