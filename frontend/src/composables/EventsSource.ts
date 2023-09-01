import type { Ref } from 'vue'
import { ref, shallowRef } from 'vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'

export type UseEventSourceOptions = EventSourceInit

/**
 * Reactive wrapper for EventSource.
 *
 * @see https://vueuse.org/useEventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource EventSource
 * @param url
 * @param events
 * @param options
 */
export function useEventsSource(http: string, token: string | null) {
  const event: Ref<string | null> = ref(null)
  const data: Ref<string | null> = ref(null)
  const status = ref('CONNECTING') as Ref<'OPEN' | 'CONNECTING' | 'CLOSED'>
  const error = shallowRef(null) as Ref<Event | null>
  /*
  const close = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
      status.value = 'CLOSED'
    }
  }
*/

  async function listen(url: string | URL) {
    console.log('connection to event source: ' + http + url)
    await fetchEventSource((http + url) as RequestInfo, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      async onopen() {
        console.log('event message listener is open')
        status.value = 'OPEN'
        error.value = null
      },
      onerror(error) {
        status.value = 'CLOSED'
        error.value = error
        throw error
      },
      onmessage(ev) {
        console.log('event message received: ' + ev.data)
        event.value = null
        data.value = ev.data
      }
    })
  }

  return {
    event,
    data,
    status,
    error,
    listen
  }
}
