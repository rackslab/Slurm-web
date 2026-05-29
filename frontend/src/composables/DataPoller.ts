/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { ref, onUnmounted, onMounted } from 'vue'
import type { Ref } from 'vue'
import {
  AuthenticationError,
  PermissionError,
  CanceledRequestError
} from '@/composables/HTTPErrors'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { GatewayAnyClusterApiKey } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'
import { useErrorsHandler } from '@/composables/ErrorsHandler'

export interface ClusterDataPoller<ResponseType> {
  data: Ref<ResponseType | undefined>
  unable: Ref<boolean>
  loaded: Ref<boolean>
  setCluster: (newCluster: string) => void
  setCallback: (newCallback: GatewayAnyClusterApiKey) => void
  setParam: (newOtherParam: string | number | undefined) => void
}

export function useClusterDataPoller<Type>(
  cluster: string,
  initialCallback: GatewayAnyClusterApiKey,
  timeout: number,
  initialOtherParam?: number | string
): ClusterDataPoller<Type> {
  let callback = initialCallback
  let otherParam = initialOtherParam
  const data: Ref<Type | undefined> = ref()
  const unable: Ref<boolean> = ref(false)
  const loaded: Ref<boolean> = ref(false)
  let _stop: boolean = false
  /*
   * Monotonic id for each poll loop. stop() bumps this so any in-flight start()
   * (awaiting poll()) cannot schedule another interval after a restart. Without
   * this, setParam/setCluster during an active request could leave multiple
   * setTimeout chains running and stack pollers every timeout ms.
   */
  let _pollGeneration = 0
  const gateway = useGatewayAPI()
  const runtime = useRuntimeStore()
  const { reportAuthenticationError, reportPermissionError } = useErrorsHandler()
  let _timeout: number = -1

  function reportOtherError(error: Error) {
    runtime.reportError(`Server error: ${error.message}`)
    unable.value = true
  }

  async function poll() {
    try {
      unable.value = false
      if (gateway.isValidGatewayClusterWithStringAPIKey(callback)) {
        data.value = (await gateway[callback](cluster, otherParam as string)) as Type
      } else if (gateway.isValidGatewayClusterWithNumberAPIKey(callback)) {
        data.value = (await gateway[callback](cluster, otherParam as number)) as Type
      } else {
        data.value = (await gateway[callback](cluster)) as Type
      }

      loaded.value = true
    } catch (error) {
      if (error instanceof AuthenticationError) {
        reportAuthenticationError(error)
      } else if (error instanceof PermissionError) {
        reportPermissionError(error)
        stop()
        unable.value = true
      } else if (!(error instanceof CanceledRequestError) && error instanceof Error) {
        /* Ignore canceled requests errors */
        reportOtherError(error)
      }
    }
  }

  async function start() {
    const generation = ++_pollGeneration
    console.log(`Start polling ${callback} on cluster ${cluster}`)
    _stop = false
    await poll()
    /* Only the latest loop may arm the next tick (generation still matches). */
    if (!_stop && generation === _pollGeneration) {
      _timeout = window.setTimeout(() => {
        /* Re-check: stop() may have run while the timer was pending. */
        if (generation === _pollGeneration) {
          void start()
        }
      }, timeout)
    }
  }

  function stop() {
    console.log(`Stop polling ${callback} for cluster ${cluster}`)
    _stop = true
    /* Invalidate in-flight start() so it will not schedule after poll() returns. */
    _pollGeneration++
    clearTimeout(_timeout)
    _timeout = -1
    gateway.abort()
  }

  function setCluster(newCluster: string) {
    stop()
    cluster = newCluster
    loaded.value = false
    start()
  }

  function setCallback(newCallback: GatewayAnyClusterApiKey) {
    stop()
    callback = newCallback
    loaded.value = false
    start()
  }

  function setParam(newOtherParam: string | number | undefined) {
    stop()
    otherParam = newOtherParam
    loaded.value = false
    start()
  }

  onMounted(() => {
    start()
  })
  onUnmounted(() => {
    stop()
  })

  return { data, unable, loaded, setCluster, setCallback, setParam }
}
