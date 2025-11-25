import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import AccountBreadcrumb from '@/components/accounts/AccountBreadcrumb.vue'
import { init_plugins } from '../../lib/common'
import type { ClusterAssociation } from '@/composables/GatewayAPI'
import associations from '../../assets/associations.json'

describe('AccountBreadcrumb.vue', () => {
  beforeEach(() => {
    init_plugins()
  })

  test('displays empty symbol when account has no parent', () => {
    const accountAssociations: ClusterAssociation[] = [
      {
        account: 'root',
        parent_account: '',
        qos: [],
        user: '',
        max: associations[0].max
      }
    ]

    const wrapper = mount(AccountBreadcrumb, {
      props: {
        cluster: 'foo',
        account: 'root',
        associations: accountAssociations
      }
    })

    console.log(wrapper.html())
    expect(wrapper.text()).toBe('∅')
  })

  test('displays empty symbol when account not found in associations', () => {
    const wrapper = mount(AccountBreadcrumb, {
      props: {
        cluster: 'foo',
        account: 'nonexistent',
        associations: []
      }
    })

    expect(wrapper.text()).toBe('∅')
  })

  test('displays single parent account', () => {
    const accountAssociations: ClusterAssociation[] = [
      {
        account: 'root',
        parent_account: '',
        qos: [],
        user: '',
        max: associations[0].max
      },
      {
        account: 'admin',
        parent_account: 'root',
        qos: [],
        user: '',
        max: associations[2].max
      }
    ]

    const wrapper = mount(AccountBreadcrumb, {
      props: {
        cluster: 'foo',
        account: 'admin',
        associations: accountAssociations
      }
    })

    // Check root link
    const rootLink = wrapper.getComponent(RouterLink)
    expect(rootLink.props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: 'root' }
    })
  })

  test('displays multiple parent accounts in hierarchy', () => {
    const accountAssociations: ClusterAssociation[] = [
      {
        account: 'root',
        parent_account: '',
        qos: [],
        user: '',
        max: associations[0].max
      },
      {
        account: 'physic',
        parent_account: 'root',
        qos: [],
        user: '',
        max: associations[686]?.max || associations[0].max
      },
      {
        account: 'acoustic',
        parent_account: 'physic',
        qos: [],
        user: '',
        max: associations[763]?.max || associations[0].max
      }
    ]

    const wrapper = mount(AccountBreadcrumb, {
      props: {
        cluster: 'foo',
        account: 'acoustic',
        associations: accountAssociations
      }
    })

    // Check root and physic links
    const links = wrapper.findAllComponents(RouterLink)
    expect(links.length).toBe(2)
    expect(links[0].props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: 'root' }
    })
    expect(links[1].props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: 'physic' }
    })

    // Check chevron separators
    const chevrons = wrapper.findAll('svg')
    expect(chevrons.length).toBe(1)
  })

  test('displays current account when showCurrent is true', () => {
    const accountAssociations: ClusterAssociation[] = [
      {
        account: 'root',
        parent_account: '',
        qos: [],
        user: '',
        max: associations[0].max
      },
      {
        account: 'admin',
        parent_account: 'root',
        qos: [],
        user: '',
        max: associations[2].max
      }
    ]

    const wrapper = mount(AccountBreadcrumb, {
      props: {
        cluster: 'foo',
        account: 'admin',
        associations: accountAssociations,
        showCurrent: true
      }
    })

    // Check root and admin links
    const links = wrapper.findAllComponents(RouterLink)
    expect(links.length).toBe(2)
    expect(links[0].props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: 'root' }
    })
    expect(links[1].props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: 'admin' }
    })
  })
})
