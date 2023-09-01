import { ref, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthenticationError, PermissionError } from '@/composables/HTTPErrors'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { GatewayGenericAPIKey, GatewayClusterAPIKey } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'

interface ClusterGetterProps {
  cluster: string
  id?: number
}

export function useGatewayDataGetter<Type>(callback: GatewayGenericAPIKey) {
  const data: Ref<Type | undefined> = ref()
  const unable: Ref<boolean> = ref(false)
  const loaded: Ref<boolean> = ref(false)
  const router = useRouter()
  const gateway = useGatewayAPI()
  const runtime = useRuntimeStore()

  function reportAuthenticationError(error: AuthenticationError) {
    runtime.reportError(`Authentication error: ${error.message}`)
    router.push({ name: 'login' })
  }

  function reportPermissionError(error: PermissionError) {
    runtime.reportError(`Permission error: ${error.message}`)
    unable.value = true
  }

  function reportOtherError(error: Error) {
    runtime.reportError(`Server error: ${error.message}`)
    unable.value = true
  }

  async function get() {
    try {
      unable.value = false
      data.value = (await gateway[callback]()) as Type
      loaded.value = true
    } catch (error: any) {
      /*
       * Skip errors received lately from other clusters, after the view cluster
       * parameter has changed.
       */
      if (error instanceof AuthenticationError) {
        reportAuthenticationError(error)
      } else if (error instanceof PermissionError) {
        reportPermissionError(error)
      } else {
        reportOtherError(error)
      }
    }
  }
  onMounted(() => {
    get()
  })
  return { data, unable, loaded }
}

export function useClusterDataGetter<Type>(
  callback: GatewayClusterAPIKey,
  props: ClusterGetterProps
) {
  const data: Ref<Type | undefined> = ref()
  const unable: Ref<boolean> = ref(false)
  const loaded: Ref<boolean> = ref(false)
  const router = useRouter()
  const gateway = useGatewayAPI()
  const runtime = useRuntimeStore()

  function reportAuthenticationError(error: AuthenticationError) {
    runtime.reportError(`Authentication error: ${error.message}`)
    router.push({ name: 'login' })
  }

  function reportPermissionError(error: PermissionError, cluster: string) {
    runtime.reportError(`Permission error: ${error.message}`)
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

  function allProps() {
    return Object.values(props) as [number]
  }

  async function get(cluster: string) {
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

  watch(
    () => props.cluster,
    (newCluster, oldCluster) => {
      console.log(`Updating ${callback} getter from cluster ${oldCluster} to ${newCluster}`)
      loaded.value = false
      get(newCluster)
    }
  )
  onMounted(() => {
    get(props.cluster)
  })
  return { data, unable, loaded }
}
