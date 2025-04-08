import { useHttp } from '@/plugins/http'
import { useAuthStore } from '@/stores/auth'
import type { ResponseType, AxiosResponse, AxiosRequestConfig } from 'axios'
import {
  AuthenticationError,
  PermissionError,
  APIServerError,
  CanceledRequestError,
  RequestError
} from '@/composables/HTTPErrors'

export function useRESTAPI() {
  const http = useHttp()
  const authStore = useAuthStore()
  let controller = new AbortController()

  function abortController() {
    controller.abort()
    controller = new AbortController()
  }

  function requestConfig(
    withToken: boolean = true,
    responseType: ResponseType = 'json'
  ): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      responseType: responseType,
      signal: controller.signal
    }
    if (withToken === true) {
      config.headers = { Authorization: `Bearer ${authStore.token}` }
    }
    return config
  }

  async function requestServer(func: () => Promise<AxiosResponse>): Promise<AxiosResponse> {
    try {
      return await func()
    } catch (error: any) {
      if (error.response) {
        /* Server replied with error status code.
         *
         * If the reponse body is an arraybuffer instead of JSON, convert it
         * to JSON first.
         */
        if (error.response.data instanceof ArrayBuffer) {
          error.response.data = JSON.parse(
            new TextDecoder().decode(error.response.data as ArrayBuffer)
          )
        }
        if (error.response.status == 401) {
          throw new AuthenticationError(error.response.data.description)
        } else if (error.response.status == 403) {
          throw new PermissionError(error.message)
        } else {
          throw new APIServerError(error.response.status, error.response.data.description)
        }
      } else if (error.request) {
        /* No reply from server */
        //console.log(error)
        if (error.code == 'ERR_CANCELED') throw new CanceledRequestError('Canceled request')
        throw new RequestError(`Request error: ${error.message}`)
      } else {
        /* Something else happening when setting up the request */
        throw new RequestError(`Setting up request error: ${error.message}`)
      }
    }
  }

  async function get<CType>(
    resource: string,
    withToken: boolean = true,
    responseType: ResponseType = 'json'
  ): Promise<CType> {
    console.log(`Slurm-web gateway API get ${resource}`)
    return (
      await requestServer(() => {
        return http.get(resource, requestConfig(withToken, responseType))
      })
    ).data as CType
  }

  async function post<CType>(
    resource: string,
    data: any,
    withToken: boolean = true,
    responseType: ResponseType = 'json'
  ): Promise<CType> {
    console.log(`Slurm-web gateway API post ${resource}`)
    return (
      await requestServer(() => {
        return http.post(resource, data, requestConfig(withToken, responseType))
      })
    ).data as CType
  }

  async function postRaw<CType>(
    resource: string,
    data: any,
    withToken: boolean = true,
    responseType: ResponseType = 'json'
  ): Promise<CType> {
    console.log(`Slurm-web gateway API post ${resource}`)
    return (await requestServer(() => {
      return http.post(resource, data, requestConfig(withToken, responseType))
    })) as CType
  }
  return {
    abortController,
    get,
    post,
    postRaw
  }
}
