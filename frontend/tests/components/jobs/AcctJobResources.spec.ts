import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import AcctJobResources from '@/components/jobs/AcctJobResources.vue'
import type { ClusterAcctJob } from '@/composables/GatewayAPI'

function acctJobFixture(overrides: Partial<ClusterAcctJob> = {}): ClusterAcctJob {
  return {
    account: 'optic',
    job_id: 1,
    nodes: 'node1',
    partition: 'gpu',
    priority: { infinite: false, number: 1, set: true },
    qos: 'normal',
    state: { current: ['COMPLETED'], reason: 'None' },
    time: {},
    tres: {
      allocated: [
        { type: 'cpu', name: '', id: 1, count: 8 },
        { type: 'mem', name: '', id: 2, count: 4096 },
        { type: 'node', name: '', id: 4, count: 2 }
      ],
      requested: []
    },
    user: 'alice',
    ...overrides
  }
}

describe('AcctJobResources.vue', () => {
  test('displays nodes, cpus and gpus from allocated TRES', () => {
    const job = acctJobFixture({
      tres: {
        allocated: [
          { type: 'node', name: '', id: 4, count: 4 },
          { type: 'cpu', name: '', id: 1, count: 16 },
          { type: 'gres', name: 'gpu', id: 1001, count: 2 }
        ],
        requested: []
      }
    })

    const wrapper = mount(AcctJobResources, { props: { job } })
    const items = wrapper.findAll('span.inline-flex')

    expect(items.length).toBe(3)
    expect(items[0].text()).toBe('4')
    expect(items[1].text()).toBe('16')
    expect(items[2].text()).toBe('2')
  })

  test('hides gpu span when no gpu is allocated', () => {
    const wrapper = mount(AcctJobResources, {
      props: { job: acctJobFixture() }
    })
    const items = wrapper.findAll('span.inline-flex')

    expect(items.length).toBe(2)
    expect(items[0].text()).toBe('2')
    expect(items[1].text()).toBe('8')
  })

  test('shows zero nodes when node TRES is missing', () => {
    const job = acctJobFixture({
      tres: {
        allocated: [{ type: 'cpu', name: '', id: 1, count: 4 }],
        requested: []
      }
    })

    const wrapper = mount(AcctJobResources, { props: { job } })
    const items = wrapper.findAll('span.inline-flex')

    expect(items[0].text()).toBe('0')
    expect(items[1].text()).toBe('4')
  })

  test('sums typed gpu gres entries', () => {
    const job = acctJobFixture({
      tres: {
        allocated: [
          { type: 'node', name: '', id: 4, count: 1 },
          { type: 'cpu', name: '', id: 1, count: 8 },
          { type: 'gres', name: 'gpu:h100', id: 1002, count: 6 }
        ],
        requested: []
      }
    })

    const wrapper = mount(AcctJobResources, { props: { job } })
    const items = wrapper.findAll('span.inline-flex')

    expect(items[2].text()).toBe('6')
  })
})
