/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ref, onUnmounted, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthenticationError, PermissionError } from '@/composables/HTTPErrors'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { GatewayAnyClusterApiKey } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'

type ClusterDataPoller<Type> = {
  data: Ref<Type | undefined>
  unable: Ref<boolean>
  loaded: Ref<boolean>
}

export function useClusterDataPoller<Type>(
  callback: GatewayAnyClusterApiKey,
  timeout: number,
  otherParam?: number | string
): ClusterDataPoller<Type> {
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

  function reportPermissionError(error: PermissionError, cluster: string) {
    runtime.reportError(`Permission error: ${error.message}`)
    stop(cluster)
    unable.value = true
  }

  function reportOtherError(error: Error) {
    runtime.reportError(`Server error: ${error.message}`)
    unable.value = true
  }

  async function poll(cluster: string) {
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
    } catch (error: any) {
      /*
       * Skip errors received lately from other clusters, after the view cluster
       * parameter has changed.
       */
      if (cluster === runtime.currentCluster?.name) {
        if (error instanceof AuthenticationError) {
          reportAuthenticationError(error)
        } else if (error instanceof PermissionError) {
          reportPermissionError(error, cluster)
        } else {
          reportOtherError(error)
        }
      }
    }
  }

  async function start(cluster: string) {
    console.log(`Start polling ${callback} on cluster ${cluster}`)
    _stop = false
    await poll(cluster)
    if (cluster === runtime.currentCluster?.name && !_stop) {
      _timeout = setTimeout(start, timeout, cluster)
    }
  }

  function stop(cluster: string) {
    console.log(`Stop polling ${callback} for cluster ${cluster}`)
    _stop = true
    clearTimeout(_timeout)
    gateway.abort()
  }

  watch(
    () => runtime.currentCluster,
    (newCluster, oldCluster) => {
      if (oldCluster) {
        stop(oldCluster.name)
      }
      console.log(
        `Updating ${callback} poller from cluster ${oldCluster?.name} to ${newCluster?.name}`
      )
      data.value = undefined
      loaded.value = false
      if (newCluster) {
        start(newCluster.name)
      }
    }
  )

  onMounted(() => {
    if (runtime.currentCluster) {
      start(runtime.currentCluster.name)
    }
  })
  onUnmounted(() => {
    if (runtime.currentCluster) {
      stop(runtime.currentCluster.name)
    }
  })

  return { data, unable, loaded }
}
