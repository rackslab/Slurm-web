/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { ref, onUnmounted, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AuthenticationError,
  PermissionError,
  CanceledRequestError
} from '@/composables/HTTPErrors'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { GatewayAnyClusterApiKey } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'

export interface ClusterDataPoller<ResponseType> {
  data: Ref<ResponseType | undefined>
  unable: Ref<boolean>
  loaded: Ref<boolean>
  setCluster: (newCluster: string) => void
  setCallback: (newCallback: GatewayAnyClusterApiKey) => void
  setParam: (newOtherParam: string | number) => void
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
  const router = useRouter()
  const gateway = useGatewayAPI()
  const runtime = useRuntimeStore()
  let _timeout: number = -1

  function reportAuthenticationError(error: AuthenticationError) {
    runtime.reportError(`Authentication error: ${error.message}`)
    router.push({ name: 'signout' })
  }

  function reportPermissionError(error: PermissionError) {
    runtime.reportError(`Permission error: ${error.message}`)
    stop()
    unable.value = true
  }

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
      } else if (!(error instanceof CanceledRequestError) && error instanceof Error) {
        /* Ignore canceled requests errors */
        reportOtherError(error)
      }
    }
  }

  async function start() {
    console.log(`Start polling ${callback} on cluster ${cluster}`)
    _stop = false
    await poll()
    if (!_stop) {
      _timeout = window.setTimeout(start, timeout, cluster)
    }
  }

  function stop() {
    console.log(`Stop polling ${callback} for cluster ${cluster}`)
    _stop = true
    clearTimeout(_timeout)
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

  function setParam(newOtherParam: string | number) {
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
