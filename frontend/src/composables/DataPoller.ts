import { ref, onUnmounted, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthenticationError, PermissionError } from '@/composables/HTTPErrors'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { GatewayClusterAPIKey } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'

interface ClusterPollerProps {
  cluster: string
  id?: number
}

export function useClusterDataPoller<Type>(
  callback: GatewayClusterAPIKey,
  timeout: number,
  props: ClusterPollerProps
) {
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
    router.push({ name: 'login' })
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

  function otherProps() {
    const { cluster, ...other } = props
    return Object.values(other) as [number]
  }

  async function poll(cluster: string) {
    try {
      unable.value = false
      data.value = (await gateway[callback](props.cluster, ...otherProps())) as Type
      loaded.value = true
    } catch (error: any) {
      /*
       * Skip errors received lately from other clusters, after the view cluster
       * parameter has changed.
       */
      if (cluster == props.cluster) {
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
    if (cluster == props.cluster && !_stop) {
      _timeout = setTimeout(start, timeout, props.cluster, ...otherProps())
    }
  }

  function stop(cluster: string) {
    console.log(`Stop polling ${callback} for cluster ${cluster}`)
    _stop = true
    clearTimeout(_timeout)
    gateway.abort()
  }

  watch(
    () => props.cluster,
    (newCluster, oldCluster) => {
      stop(oldCluster)
      console.log(`Updating ${callback} poller from cluster ${oldCluster} to ${newCluster}`)
      data.value = undefined
      loaded.value = false
      start(newCluster)
    }
  )

  onMounted(() => {
    start(props.cluster)
  })
  onUnmounted(() => {
    stop(props.cluster)
  })

  return { data, unable, loaded }
}
