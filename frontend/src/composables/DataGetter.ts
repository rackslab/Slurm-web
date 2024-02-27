import { ref, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthenticationError, PermissionError } from '@/composables/HTTPErrors'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { GatewayGenericAPIKey, GatewayAnyClusterApiKey } from '@/composables/GatewayAPI'
import { useRuntimeStore } from '@/stores/runtime'

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
  callback: GatewayAnyClusterApiKey,
  otherParam?: string | number
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

  function reportPermissionError(error: PermissionError) {
    runtime.reportError(`Permission error: ${error.message}`)
    unable.value = true
  }

  function reportOtherError(error: Error) {
    runtime.reportError(`Server error: ${error.message}`)
    unable.value = true
  }

  async function get(cluster: string) {
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
          reportPermissionError(error)
        } else {
          reportOtherError(error)
        }
      }
    }
  }

  watch(
    () => runtime.currentCluster,
    (newCluster, oldCluster) => {
      console.log(
        `Updating ${callback} getter from cluster ${oldCluster?.name} to ${newCluster?.name}`
      )
      loaded.value = false
      if (newCluster) {
        get(newCluster.name)
      }
    }
  )
  onMounted(() => {
    if (runtime.currentCluster) {
      get(runtime.currentCluster.name)
    }
  })
  return { data, unable, loaded }
}
