import { describe, test, expect, beforeEach, vi } from 'vitest'
import { RouterLink } from 'vue-router'
import { mount } from '@vue/test-utils'
import QosView from '@/views/QosView.vue'
import QosHelpModal from '@/components/qos/QosHelpModal.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterQos } from '@/composables/GatewayAPI'
import qos from '../assets/qos.json'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterQos[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('QosView.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true
      }
    ]
    // Reset mockClusterDataPoller unable to its default value before every tests.
    mockClusterDataPoller.unable.value = false
  })
  test('display qos', () => {
    mockClusterDataPoller.data.value = qos
    // Check at least one QOS is present in test asset or the test is pointless.
    expect(qos.length).toBeGreaterThan(0)
    const wrapper = mount(QosView, {
      props: {
        cluster: 'foo'
      }
    })
    // Retrieve table body lines
    const qosTableLines = wrapper.get('main table tbody').findAll('tr')
    // Check one line per qos in table body
    expect(qosTableLines.length).toBe(qos.length)
    // Check name and description of QOS are present
    for (const [i, value] of qosTableLines.entries()) {
      expect(qosTableLines[i].find('td p.text-base').text()).toBe(qos[i].name)
      expect(qosTableLines[i].find('td p.text-gray-500').text()).toBe(qos[i].description)
    }
  })
  test('show error alert when unable to retrieve QOS', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(QosView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve qos from cluster foo')
  })
  test('show info alert when no QOS defined', () => {
    mockClusterDataPoller.data.value = []
    const wrapper = mount(QosView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(InfoAlert).text()).toBe('No qos defined on cluster foo')
  })
  test('open qos help modal', async () => {
    mockClusterDataPoller.data.value = qos
    const wrapper = mount(QosView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          QosHelpModal: true
        }
      }
    })
    /*
     * Check help modal show property is set to true when help button is clicked in QOS
     * table body.
     */
    const modal = wrapper.getComponent(QosHelpModal)
    expect(modal.props('helpModalShow')).toBeFalsy()
    await wrapper.get('main table tbody button').trigger('click')
    expect(modal.props('helpModalShow')).toBeTruthy()
  })
  test('click qos jobs filter', async () => {
    mockClusterDataPoller.data.value = qos
    const wrapper = mount(QosView, {
      props: {
        cluster: 'foo'
      }
    })
    /*
     * Check link targets of all router links in table body point to jobs view with
     * current qos filter.
     */
    const jobsQosFilterLinks = wrapper.get('main table tbody').findAllComponents(RouterLink)
    for (const [i, value] of jobsQosFilterLinks.entries()) {
      expect(value.props('to')).toStrictEqual({
        name: 'jobs',
        params: { cluster: 'foo' },
        query: { qos: qos[i].name }
      })
    }
  })
})
