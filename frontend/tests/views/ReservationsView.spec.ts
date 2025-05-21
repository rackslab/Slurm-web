import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReservationsView from '@/views/ReservationsView.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterReservation } from '@/composables/GatewayAPI'
import reservations from '../assets/reservations.json'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterReservation[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))
describe('ReservationsView.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().availableClusters = [
      { name: 'foo', permissions: { roles: [], actions: [] }, infrastructure: 'foo', metrics: true }
    ]
    // Reset mockClusterDataPoller unable to its default value before every tests.
    mockClusterDataPoller.unable.value = false
  })
  test('display reservations', () => {
    mockClusterDataPoller.data.value = reservations
    // Check at least one reservation is present in test asset or the test is pointless.
    expect(reservations.length).toBeGreaterThan(0)
    const wrapper = mount(ReservationsView, {
      props: {
        cluster: 'foo'
      }
    })
    // Retrieve table body lines
    const reservationsTableLines = wrapper.get('main table tbody').findAll('tr')
    // Check one line per reservation in table body
    expect(reservationsTableLines.length).toBe(reservations.length)
    /* For all reservations defined in test asset, check:
     * - name in 1st cell
     * - users in 5th cell
     * - account in 6th cell
     * - flags in 7th cell
     */
    for (const [i, value] of reservationsTableLines.entries()) {
      const reservationCells = reservationsTableLines[i].findAll('td')
      expect(reservationCells[0].text()).toBe(reservations[i].name)
      // if users in reservations, check all li items else check li absence
      if (reservations[i].users.length)
        expect(reservationCells[4].findAll('li').map((element) => element.text())).toStrictEqual(
          reservations[i].users.split(',')
        )
      else expect(() => reservationCells[4].get('li')).toThrowError()
      // if accounts in reservations, check all li items else check li absence
      if (reservations[i].accounts.length)
        expect(reservationCells[5].findAll('li').map((element) => element.text())).toStrictEqual(
          reservations[i].accounts.split(',')
        )
      else expect(() => reservationCells[5].get('li')).toThrowError()
      expect(reservationCells[6].findAll('span').map((element) => element.text())).toStrictEqual(
        reservations[i].flags
      )
    }
  })
  test('show error alert when unable to retrieve reservations', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(ReservationsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe(
      'Unable to retrieve reservations from cluster foo'
    )
  })
  test('show info alert when no reservation defined', () => {
    mockClusterDataPoller.data.value = []
    const wrapper = mount(ReservationsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(InfoAlert).text()).toBe('No reservation defined on cluster foo')
  })
})
