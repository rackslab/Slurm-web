import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import AccountTreeNode from '@/components/accounts/AccountTreeNode.vue'
import { init_plugins } from '../../lib/common'
import type { ClusterAccountTreeNode } from '@/composables/GatewayAPI'
import associations from '../../assets/associations.json'

describe('AccountTreeNode.vue', () => {
  beforeEach(() => {
    init_plugins()
  })

  test('renders accounts tree collapsed', () => {
    const node: ClusterAccountTreeNode = {
      account: 'root',
      children: [
        {
          account: 'admin',
          children: [],
          level: 1,
          parent_account: 'root',
          qos: [],
          users: [],
          max: associations[2].max
        }
      ],
      level: 0,
      parent_account: '',
      qos: ['normal'],
      users: ['root', 'user1'],
      max: associations[0].max
    }

    const wrapper = mount(AccountTreeNode, {
      props: {
        node,
        expandedAccounts: new Set<string>(),
        cluster: 'foo'
      }
    })

    // Get root account card
    const rootCard = wrapper.get('div#account-tree-node-root')

    // Verify expand button is present
    const expandButton = rootCard.get('button')
    expect(expandButton.text()).toBe('Toggle root')

    // Verify RouterLink exists and has correct props for account name
    const link = rootCard.getComponent(RouterLink)
    expect(link.props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: 'root' }
    })

    // Verify admin account card is not expanded
    const adminCard = wrapper.find('div#account-tree-node-admin')
    expect(adminCard.exists()).toBe(false)
  })

  test('renders children when expanded', () => {
    const node: ClusterAccountTreeNode = {
      account: 'root',
      children: [
        {
          account: 'admin',
          children: [],
          level: 1,
          parent_account: 'root',
          qos: [],
          users: [],
          max: associations[2].max
        }
      ],
      level: 0,
      parent_account: '',
      qos: ['normal'],
      users: [],
      max: associations[0].max
    }

    const wrapper = mount(AccountTreeNode, {
      props: {
        node,
        expandedAccounts: new Set(['root']),
        cluster: 'foo'
      }
    })

    // Check root card is present
    wrapper.get('div#account-tree-node-root')
    // Check admin card is present
    wrapper.get('div#account-tree-node-admin')
  })

  test('does not show expand button when node has no children', () => {
    const node: ClusterAccountTreeNode = {
      account: 'root',
      children: [],
      level: 0,
      parent_account: '',
      qos: ['normal'],
      users: [],
      max: associations[0].max
    }

    const wrapper = mount(AccountTreeNode, {
      props: {
        node,
        expandedAccounts: new Set<string>(),
        cluster: 'foo'
      }
    })

    const expandButton = wrapper.get('div#account-tree-node-root').find('button')
    expect(expandButton.exists()).toBe(false)
  })

  test('emits toggle event when expand button is clicked', async () => {
    const node: ClusterAccountTreeNode = {
      account: 'root',
      children: [
        {
          account: 'admin',
          children: [],
          level: 1,
          parent_account: 'root',
          qos: [],
          users: [],
          max: associations[2].max
        }
      ],
      level: 0,
      parent_account: '',
      qos: ['normal'],
      users: [],
      max: associations[0].max
    }

    const wrapper = mount(AccountTreeNode, {
      props: {
        node,
        expandedAccounts: new Set<string>(),
        cluster: 'foo'
      }
    })

    const button = wrapper.get('div#account-tree-node-root').get('button')
    await button.trigger('click')

    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]![0]).toBe('root')
  })
})
