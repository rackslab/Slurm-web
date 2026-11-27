/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { useRESTAPI } from '@/composables/RESTAPI'
import type { AxiosResponse } from 'axios'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import { AuthenticationError, APIServerError } from '@/composables/HTTPErrors'
import type {
  AccountDescription,
  GatewayAnonymousLoginResponse,
  GatewayLoginResponse,
  LoginIdents,
  UserDescription
} from '@/composables/gateway/types/auth'
import type { CacheStatistics } from '@/composables/gateway/types/cache'
import type {
  ClusterDescription,
  ClusterPingResponse,
  ClusterStats
} from '@/composables/gateway/types/cluster'
import type {
  JobMetrics,
  JobMetricsDetail,
  JobMetricsQuery,
  MetricCacheResult,
  MetricJobState,
  MetricResourceState,
  MetricValue
} from '@/composables/gateway/types/metrics'
import type {
  RacksDBAPIImage,
  RacksDBInfrastructureCoordinates
} from '@/composables/gateway/types/racksdb'
import type {
  SlurmAcctJob,
  SlurmAssociation,
  SlurmJob,
  SlurmJobDetail,
  SlurmNode,
  SlurmNodeDetail,
  SlurmPartition,
  SlurmQos,
  SlurmReservation
} from '@/composables/gateway/slurm/types'

export const GatewayGenericAPIKeys = ['clusters', 'users', 'message_login'] as const
export type GatewayGenericAPIKey = (typeof GatewayGenericAPIKeys)[number]

export const GatewayClusterAPIKeys = [
  'stats',
  'nodes',
  'partitions',
  'qos',
  'reservations',
  'accounts',
  'associations',
  'cache_stats'
] as const
export type GatewayClusterAPIKey = (typeof GatewayClusterAPIKeys)[number]

export const GatewayClusterWithNumberAPIKeys = ['job', 'job_metrics', 'jobsPast'] as const
export type GatewayClusterWithNumberAPIKey = (typeof GatewayClusterWithNumberAPIKeys)[number]

export const GatewayClusterWithStringAPIKeys = [
  'node',
  'jobs',
  'metrics_nodes',
  'metrics_cores',
  'metrics_gpus',
  'metrics_jobs',
  'metrics_cache'
] as const
export type GatewayClusterWithStringAPIKey = (typeof GatewayClusterWithStringAPIKeys)[number]

export const GatewayClusterWithQueryAPIKeys = ['job_metrics_query'] as const
export type GatewayClusterWithQueryAPIKey = (typeof GatewayClusterWithQueryAPIKeys)[number]

export type GatewayAnyClusterApiKey =
  | GatewayClusterAPIKey
  | GatewayClusterWithNumberAPIKey
  | GatewayClusterWithStringAPIKey
  | GatewayClusterWithQueryAPIKey

export function isValidGatewayGenericAPIKey(key: string): key is GatewayGenericAPIKey {
  return typeof key === 'string' && GatewayGenericAPIKeys.includes(key as GatewayGenericAPIKey)
}

export function isValidGatewayClusterAPIKey(key: string): key is GatewayClusterAPIKey {
  return typeof key === 'string' && GatewayClusterAPIKeys.includes(key as GatewayClusterAPIKey)
}

export function isValidGatewayClusterWithStringAPIKey(
  key: string
): key is GatewayClusterWithStringAPIKey {
  return (
    typeof key === 'string' &&
    GatewayClusterWithStringAPIKeys.includes(key as GatewayClusterWithStringAPIKey)
  )
}

export function isValidGatewayClusterWithNumberAPIKey(
  key: string
): key is GatewayClusterWithNumberAPIKey {
  return (
    typeof key === 'string' &&
    GatewayClusterWithNumberAPIKeys.includes(key as GatewayClusterWithNumberAPIKey)
  )
}

export function isValidGatewayClusterWithQueryAPIKey(
  key: string
): key is GatewayClusterWithQueryAPIKey {
  return (
    typeof key === 'string' &&
    GatewayClusterWithQueryAPIKeys.includes(key as GatewayClusterWithQueryAPIKey)
  )
}

export function useGatewayAPI() {
  const restAPI = useRESTAPI()
  const runtimeConfiguration = useRuntimeConfiguration()

  async function login(idents: LoginIdents): Promise<GatewayLoginResponse> {
    try {
      return (await restAPI.post('/login', idents, false)) as GatewayLoginResponse
    } catch (error) {
      if (error instanceof APIServerError && error.status == 401) {
        throw new AuthenticationError(error.message)
      }
      throw error
    }
  }

  async function oidcSession(): Promise<GatewayLoginResponse> {
    try {
      return (await restAPI.get('/oidc/session', false, 'json', true)) as GatewayLoginResponse
    } catch (error) {
      if (error instanceof APIServerError && error.status == 401) {
        throw new AuthenticationError(error.message)
      }
      throw error
    }
  }

  async function anonymousLogin(): Promise<GatewayAnonymousLoginResponse> {
    try {
      return (await restAPI.get('/anonymous', false)) as GatewayAnonymousLoginResponse
    } catch (error) {
      if (error instanceof APIServerError && error.status == 401) {
        throw new AuthenticationError(error.message)
      }
      throw error
    }
  }

  async function message_login(): Promise<string> {
    return await restAPI.get<string>('/messages/login', false)
  }

  async function clusters(): Promise<Array<ClusterDescription>> {
    return await restAPI.get<ClusterDescription[]>(`/clusters`)
  }

  async function users(): Promise<Array<UserDescription>> {
    return await restAPI.get<UserDescription[]>(`/users`)
  }

  async function ping(cluster: string): Promise<ClusterPingResponse> {
    return await restAPI.get<ClusterPingResponse>(`/agents/${cluster}/ping`)
  }

  async function stats(cluster: string): Promise<ClusterStats> {
    return await restAPI.get<ClusterStats>(`/agents/${cluster}/stats`)
  }

  async function jobs(cluster: string, node?: string): Promise<SlurmJob[]> {
    if (node) return await restAPI.get<SlurmJob[]>(`/agents/${cluster}/jobs?node=${node}`)
    return await restAPI.get<SlurmJob[]>(`/agents/${cluster}/jobs`)
  }

  async function jobsPast(cluster: string, hours: number): Promise<SlurmAcctJob[]> {
    return await restAPI.get<SlurmAcctJob[]>(`/agents/${cluster}/jobs/past?hours=${hours}`)
  }

  async function job(cluster: string, jobId: number): Promise<SlurmJobDetail> {
    return await restAPI.get<SlurmJobDetail>(`/agents/${cluster}/job/${jobId}`)
  }

  async function nodes(cluster: string): Promise<SlurmNode[]> {
    return await restAPI.get<SlurmNode[]>(`/agents/${cluster}/nodes`)
  }

  async function node(cluster: string, nodeName: string): Promise<SlurmNodeDetail> {
    return await restAPI.get<SlurmNodeDetail>(`/agents/${cluster}/node/${nodeName}`)
  }

  async function partitions(cluster: string): Promise<SlurmPartition[]> {
    return await restAPI.get<SlurmPartition[]>(`/agents/${cluster}/partitions`)
  }

  async function qos(cluster: string): Promise<SlurmQos[]> {
    return await restAPI.get<SlurmQos[]>(`/agents/${cluster}/qos`)
  }

  async function reservations(cluster: string): Promise<SlurmReservation[]> {
    return await restAPI.get<SlurmReservation[]>(`/agents/${cluster}/reservations`)
  }

  async function accounts(cluster: string): Promise<Array<AccountDescription>> {
    return await restAPI.get<AccountDescription[]>(`/agents/${cluster}/accounts`)
  }

  async function associations(cluster: string): Promise<Array<SlurmAssociation>> {
    return await restAPI.get<SlurmAssociation[]>(`/agents/${cluster}/associations`)
  }

  async function job_metrics(cluster: string, job: number): Promise<JobMetrics> {
    return await restAPI.get<JobMetrics>(`/agents/${cluster}/job/${job}/metrics`)
  }

  /* Return job metrics with optional detail per node or GPU and time range. */
  async function job_metrics_query(
    cluster: string,
    query: JobMetricsQuery
  ): Promise<JobMetrics | JobMetricsDetail> {
    const parameters = new URLSearchParams()
    if (query.detail) parameters.set('detail', 'true')
    if (query.start !== undefined) parameters.set('start', query.start.toString())
    if (query.end !== undefined) parameters.set('end', query.end.toString())
    const suffix = parameters.size ? `?${parameters.toString()}` : ''
    return await restAPI.get<JobMetrics | JobMetricsDetail>(
      `/agents/${cluster}/job/${query.job}/metrics${suffix}`
    )
  }

  async function cache_stats(cluster: string): Promise<CacheStatistics> {
    return await restAPI.get<CacheStatistics>(`/agents/${cluster}/cache/stats`)
  }

  async function cache_reset(cluster: string): Promise<CacheStatistics> {
    return await restAPI.post<CacheStatistics>(`/agents/${cluster}/cache/reset`, {})
  }

  async function metrics_nodes(
    cluster: string,
    last: string
  ): Promise<Record<MetricResourceState, MetricValue[]>> {
    return await restAPI.get<Record<MetricResourceState, MetricValue[]>>(
      `/agents/${cluster}/metrics/nodes?range=${last}`
    )
  }

  async function metrics_cores(
    cluster: string,
    last: string
  ): Promise<Record<MetricResourceState, MetricValue[]>> {
    return await restAPI.get<Record<MetricResourceState, MetricValue[]>>(
      `/agents/${cluster}/metrics/cores?range=${last}`
    )
  }

  async function metrics_gpus(
    cluster: string,
    last: string
  ): Promise<Record<MetricResourceState, MetricValue[]>> {
    return await restAPI.get<Record<MetricResourceState, MetricValue[]>>(
      `/agents/${cluster}/metrics/gpus?range=${last}`
    )
  }

  async function metrics_jobs(
    cluster: string,
    last: string
  ): Promise<Record<MetricJobState, MetricValue[]>> {
    return await restAPI.get<Record<MetricJobState, MetricValue[]>>(
      `/agents/${cluster}/metrics/jobs?range=${last}`
    )
  }

  async function metrics_cache(
    cluster: string,
    last: string
  ): Promise<Record<MetricCacheResult, MetricValue[]>> {
    return await restAPI.get<Record<MetricCacheResult, MetricValue[]>>(
      `/agents/${cluster}/metrics/cache?range=${last}`
    )
  }

  /* Return RacksDB racks colors drawing parameters adapted to color scheme. */
  function racksColors(): Record<string, string> {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return { frame: '#555555', pane: '#505050' }
    }
    return {}
  }

  async function infrastructureImagePng(
    cluster: string,
    infrastructure: string,
    width: number,
    height: number
  ): Promise<[RacksDBAPIImage, RacksDBInfrastructureCoordinates]> {
    const rack_colors = racksColors()
    const response = await restAPI.postRaw<AxiosResponse>(
      `/agents/${cluster}/racksdb/draw/infrastructure/${infrastructure}.png?coordinates`,
      {
        general: { pixel_perfect: true },
        dimensions: { width: width, height: height },
        infrastructure: { equipment_labels: false, ghost_unselected: true },
        row: { labels: runtimeConfiguration.racksdb_rows_labels },
        rack: { labels: runtimeConfiguration.racksdb_racks_labels },
        colors: { racks: [rack_colors] }
      },
      true,
      'arraybuffer'
    )
    const multipart = await new Response(response.data, {
      headers: response.headers as HeadersInit
    }).formData()
    const image = multipart.get('image') as File
    const coordinates = JSON.parse(await (multipart.get('coordinates') as File)?.text())
    return [
      new Blob([image], { type: image.type }) as RacksDBAPIImage,
      coordinates as RacksDBInfrastructureCoordinates
    ]
  }

  /* Return 3D representation of the infrastructure in glTF binary format. */
  async function infrastructureGlb(cluster: string, infrastructure: string): Promise<ArrayBuffer> {
    const response = await restAPI.postRaw<AxiosResponse<ArrayBuffer>>(
      `/agents/${cluster}/racksdb/draw/infrastructure/${infrastructure}.glb`,
      {
        infrastructure: { ghost_unselected: true },
        colors: { racks: [racksColors()] }
      },
      true,
      'arraybuffer'
    )
    return response.data
  }

  function abort() {
    console.log('Aborting requests')
    restAPI.abortController()
  }

  return {
    login,
    oidcSession,
    anonymousLogin,
    message_login,
    clusters,
    users,
    ping,
    stats,
    jobs,
    jobsPast,
    job,
    job_metrics,
    job_metrics_query,
    nodes,
    node,
    partitions,
    qos,
    reservations,
    accounts,
    associations,
    cache_stats,
    cache_reset,
    metrics_nodes,
    metrics_cores,
    metrics_gpus,
    metrics_jobs,
    metrics_cache,
    infrastructureImagePng,
    infrastructureGlb,
    abort,
    isValidGatewayGenericAPIKey,
    isValidGatewayClusterAPIKey,
    isValidGatewayClusterWithStringAPIKey,
    isValidGatewayClusterWithNumberAPIKey,
    isValidGatewayClusterWithQueryAPIKey
  }
}
