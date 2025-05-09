/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useRESTAPI } from '@/composables/RESTAPI'
import type { AxiosResponse } from 'axios'
import { useRuntimeConfiguration } from '@/plugins/runtimeConfiguration'
import { AuthenticationError, APIServerError } from '@/composables/HTTPErrors'
import type { JobSortCriterion, JobSortOrder } from '@/stores/runtime/jobs'

interface loginIdents {
  user: string
  password: string
}

export interface ClusterDescription {
  name: string
  racksdb: boolean
  infrastructure: string
  metrics: boolean
  permissions: ClusterPermissions
  stats?: ClusterStats
  error?: boolean
}

interface ClusterPermissions {
  roles: string[]
  actions: string[]
}

export interface UserDescription {
  login: string
  fullname: string
}

export interface AccountDescription {
  name: string
}

interface GatewayLoginResponse extends UserDescription {
  token: string
  groups: string[]
}

interface GatewayAnonymousLoginResponse {
  token: string
}

export interface ClusterStats {
  resources: {
    nodes: number
    cores: number
    memory: number
    gpus: number
  }
  jobs: {
    running: number
    total: number
  }
  version: string
}

export interface ClusterJob {
  account: string
  cpus: ClusterOptionalNumber
  job_id: number
  job_state: string[]
  node_count: ClusterOptionalNumber
  nodes: string
  partition: string
  priority: ClusterOptionalNumber
  qos: string
  state_reason: string
  user_name: string
}

export interface ClusterTRES {
  count: number
  id: number
  name: string
  type: string
}

export interface ClusterOptionalNumber {
  infinite: boolean
  number: number
  set: boolean
}

/* Compare two ClusterOptionalNumber a and b.
 * Return 0 if a and b are equal. On ascending order, return 1 if a is over b
 * else -1. Values are inverted in descending order. */
function compareClusterOptionalNumberOrder(
  a: ClusterOptionalNumber,
  b: ClusterOptionalNumber,
  order: JobSortOrder
): number {
  /* Check both values are set */
  if (!a.set) {
    if (b.set) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  }
  if (!b.set) {
    return order == 'asc' ? 1 : -1
  }
  /* Check infinite values */
  if (a.infinite) {
    if (!b.infinite) {
      return order == 'asc' ? 1 : -1
    }
    return 0
  }
  /* Check number values */
  if (a.number > b.number) {
    return order == 'asc' ? 1 : -1
  }
  if (a.number < b.number) {
    return order == 'asc' ? -1 : 1
  }
  /* Both values are equal */
  return 0
}

export interface ClusterPreciseTime {
  seconds: number
  microseconds: number
}

export interface ClusterJobTime {
  elapsed: number
  eligible: number
  end: number
  limit: ClusterOptionalNumber
  start: number
  submission: number
  suspended: number
  system: ClusterPreciseTime
  total: ClusterPreciseTime
  user: ClusterPreciseTime
}

interface ClusterAccountedResources {
  average: ClusterTRES[]
  max: ClusterTRES[]
  min: ClusterTRES[]
  total: ClusterTRES[]
}

export interface ClusterJobStep {
  CPU: {
    governor: string
    requested_frequency: { max: ClusterOptionalNumber; min: ClusterOptionalNumber }
  }
  exit_code: ClusterJobExitCode
  kill_request_user: string
  nodes: { count: number; list: string[]; range: string }
  pid: string
  state: string[]
  statistics: { CPU: { actual_frequency: number }; energy: { consumed: ClusterOptionalNumber } }
  step: { id: string; name: string }
  task: { distribution: string }
  tasks: { count: number }
  time: {
    elapsed: number
    end: ClusterOptionalNumber
    start: ClusterOptionalNumber
    suspended: number
    system: ClusterPreciseTime
    total: ClusterPreciseTime
    user: ClusterPreciseTime
  }
  tres: {
    allocated: ClusterTRES[]
    consumed: ClusterAccountedResources
    requested: ClusterAccountedResources
  }
}

export interface ClusterJobComment {
  administrator: string
  job: string
  system: string
}

export interface ClusterJobExitCode {
  return_code: ClusterOptionalNumber
  signal: { id: ClusterOptionalNumber; name: string }
  status: string[]
}

export interface ClusterIndividualJob {
  accrue_time: ClusterOptionalNumber
  association: { account: string; cluster: string; id: number; partition: string; user: string }
  batch_flag: boolean
  command: string
  comment: ClusterJobComment
  cpus: ClusterOptionalNumber
  current_working_directory: string
  derived_exit_code: ClusterJobExitCode
  exclusive: string[]
  exit_code: ClusterJobExitCode
  group: string
  last_sched_evaluation: ClusterOptionalNumber
  name: string
  node_count: ClusterOptionalNumber
  nodes: string
  partition: string
  priority: ClusterOptionalNumber
  qos: string
  script: string
  standard_error: string
  standard_input: string
  standard_output: string
  state: { current: string[]; reason: string }
  steps: ClusterJobStep[]
  submit_line: string
  tasks: ClusterOptionalNumber
  time: ClusterJobTime
  tres: { allocated: ClusterTRES[]; requested: ClusterTRES[] }
  tres_req_str: string
  used_gres: string
  user: string
  wckey: { flags: string[]; wckey: string }
  working_directory: string
}

/* Compare two ClusterJob a and b on JobSortCriterion.
 * Return 0 if a and b are equal. On ascending order, return 1 if a is over b
 * else -1. Values are inverted in descending order. */
export function compareClusterJobSortOrder(
  a: ClusterJob,
  b: ClusterJob,
  sort: JobSortCriterion,
  order: JobSortOrder
): number {
  if (sort == 'user') {
    if (a.user_name > b.user_name) {
      return order == 'asc' ? 1 : -1
    }
    if (a.user_name < b.user_name) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'state') {
    if (a.job_state > b.job_state) {
      return order == 'asc' ? 1 : -1
    }
    if (a.job_state < b.job_state) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  } else if (sort == 'priority') {
    return compareClusterOptionalNumberOrder(a.priority, b.priority, order)
  } else if (sort == 'resources') {
    const cmp = compareClusterOptionalNumberOrder(a.node_count, b.node_count, order)
    // if node count is different, return the value of the comparison
    if (cmp) return cmp
    // else return the comparison of cpus count
    return compareClusterOptionalNumberOrder(a.cpus, b.cpus, order)
  } else {
    // by default, sort by id
    if (a.job_id > b.job_id) {
      return order == 'asc' ? 1 : -1
    }
    if (a.job_id < b.job_id) {
      return order == 'asc' ? -1 : 1
    }
    return 0
  }
}


/* Convert a number of megabytes into a string with simplified unit (eg. GB, TB)
 * when possible. Round value with up to 2 decimals. */
export function getMBHumanUnit(megabytes: number): string {
  if (!megabytes) return '0'
  let value = megabytes
  let divides = 0
  const units = ['MB', 'GB', 'TB']
  while (value > 1024) {
    value /= 1024
    divides += 1
  }
  return `${Math.round(value * 100) / 100}${units[divides]}`
}

export type ClusterNodeMainState = 'down' | 'drain' | 'draining' | 'up'
export type ClusterNodeAllocatedState = 'allocated' | 'mixed' | 'idle' | 'unavailable'

export function getNodeMainState(node: ClusterNode): ClusterNodeMainState {
  if (node.state.includes('DOWN')) {
    return 'down'
  } else if (node.state.includes('DRAIN') && node.state.includes('IDLE')) {
    return 'drain'
  } else if (node.state.includes('DRAIN')) {
    return 'draining'
  } else {
    return 'up'
  }
}

export function getNodeAllocationState(node: ClusterNode): ClusterNodeAllocatedState {
  if (node.state.includes('ALLOCATED')) {
    return 'allocated'
  } else if (node.state.includes('MIXED')) {
    return 'mixed'
  } else if (node.state.includes('DOWN')) {
    return 'unavailable'
  } else {
    return 'idle'
  }
}

interface NodeGPU {
  model: string
  count: number
}

export function getNodeGPUFromGres(fullGres: string): NodeGPU[] {
  if (!fullGres.length) return []
  const results: NodeGPU[] = []
  fullGres.split(',').forEach((gres) => {
    const [type, model, end] = gres.split(':')
    if (type != 'gpu') return
    let count = -1
    if (end.includes('(')) count = parseInt(end.split('(')[0])
    else count = parseInt(end)
    results.push({ model: model, count: count })
  })
  return results
}

export function getNodeGPU(fullGres: string): string[] {
  const results: string[] = []
  getNodeGPUFromGres(fullGres).forEach((gpu) => {
    results.push(`${gpu.count} x ${gpu.model}`)
  })
  return results
}

export interface ClusterNode {
  alloc_cpus: number
  alloc_idle_cpus: number
  cores: number
  cpus: number
  gres: string
  gres_used: string
  name: string
  partitions: Array<string>
  real_memory: number
  sockets: number
  state: Array<string>
  reason: string
}

export interface ClusterIndividualNode extends ClusterNode {
  architecture: string
  operating_system: string
  boot_time: ClusterOptionalNumber
  last_busy: ClusterOptionalNumber
  threads: number
  alloc_memory: number
}

export interface ClusterPartition {
  name: string
  node_sets: string
}

export interface ClusterQos {
  description: string
  flags: string[]
  limits: {
    factor: ClusterOptionalNumber
    grace_time: number
    max: {
      accruing: {
        per: {
          account: ClusterOptionalNumber // MaxJobsAccruePerAccount
          user: ClusterOptionalNumber // MaxJobsAccruePerUser
        }
      }
      active_jobs: {
        accruing: ClusterOptionalNumber // GrpJobsAccrue
        count: ClusterOptionalNumber // GrpJobs
      }
      jobs: {
        active_jobs: {
          per: {
            account: ClusterOptionalNumber // MaxJobsPerAccount
            user: ClusterOptionalNumber // MaxJobsPerUser
          }
        }
        per: {
          account: ClusterOptionalNumber // MaxJobsSubmitPerAccount
          user: ClusterOptionalNumber // MaxJobsSubmitPerUser
        }
      }
      tres: {
        minutes: {
          per: {
            account: ClusterTRES[] // MaxTRESRunMinsPerAccount
            job: ClusterTRES[] // MaxTRESMinsPerJob
            qos: ClusterTRES[] // GrpTRESMins
            user: ClusterTRES[] // MaxTRESRunMinsPerUser
          }
        }
        per: {
          account: ClusterTRES[] // MaxTRESPA
          job: ClusterTRES[] // MaxTRES
          node: ClusterTRES[] // MaxTRESPerNode
          user: ClusterTRES[] // MaxTRESPerUser
        }
        total: ClusterTRES[] // GrpTRES
      }
      wall_clock: {
        per: {
          job: ClusterOptionalNumber // MaxWall, in minutes
          qos: ClusterOptionalNumber // GrpWall
        }
      }
    }
    min: {
      priority_threshold: ClusterOptionalNumber // MinPrioThreshold
      tres: {
        per: {
          job: ClusterTRES[] // MinTRES
        }
      }
    }
  }
  name: string
  priority: ClusterOptionalNumber
}

export interface ClusterReservation {
  accounts: string
  end_time: ClusterOptionalNumber
  flags: string[]
  name: string
  node_count: number
  node_list: string
  start_time: ClusterOptionalNumber
  users: string
}

export type MetricValue = [number, number]
const MetricRanges = ['week', 'day', 'hour'] as const
export type MetricRange = (typeof MetricRanges)[number]
export type MetricResourceState = 'idle' | 'down' | 'mixed' | 'allocated' | 'drain' | 'unknown'
export type MetricJobState =
  | 'unknown'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'completing'
  | 'running'
  | 'pending'

export function isMetricRange(range: unknown): range is MetricRange {
  return typeof range === 'string' && MetricRanges.includes(range as MetricRange)
}

export function renderClusterOptionalNumber(optionalNumber: ClusterOptionalNumber): string {
  if (!optionalNumber.set) {
    return '-'
  }
  if (optionalNumber.infinite) {
    return '∞'
  }
  return optionalNumber.number.toString()
}

function sortClusterTRES(tres_a: ClusterTRES, tres_b: ClusterTRES) {
  const allTRES = ['node', 'cpu', 'mem']
  return allTRES.indexOf(tres_a.type) - allTRES.indexOf(tres_b.type)
}

export function renderClusterTRES(tres: ClusterTRES[]): string {
  if (tres.length == 0) {
    return '-'
  }
  return tres
    .sort((a, b) => sortClusterTRES(a, b))
    .map((_tres) => _tres.type + '=' + _tres.count)
    .join()
}

export function renderClusterTRESHuman(tres: ClusterTRES[]): string {
  if (tres.length == 0) {
    return '-'
  }

  function renderClusterTRESComponent(type: string, count: number): string {
    switch (type) {
      case 'node':
        return `${count} ${type}${count > 1 ? 's' : ''}`
      case 'cpu':
        return `${count} CPU${count > 1 ? 's' : ''}`
      case 'mem':
        return `${count} MB of memory`
      default:
        return `${count} ${type}${count > 1 ? 's' : ''}`
    }
  }

  return tres
    .sort((a, b) => sortClusterTRES(a, b))
    .map((_tres) => renderClusterTRESComponent(_tres.type, _tres.count))
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1')
}

export function renderQosFlag(flag: string): string {
  switch (flag) {
    case 'OVERRIDE_PARTITION_QOS':
      return 'OverPartQos'
    default:
      return flag
  }
}

export function renderWalltime(value: ClusterOptionalNumber): string {
  if (!value.set) {
    return '-'
  }
  if (value.infinite) {
    return '∞'
  }
  let minutes = value.number
  let result = ''
  if (minutes > 60 * 24) {
    const nb_days = Math.floor(minutes / (60 * 24))
    result += nb_days.toString() + ' days '
    minutes -= nb_days * (60 * 24)
  }
  if (minutes > 60) {
    const nb_hours = Math.floor(minutes / 60)
    result += nb_hours.toString() + ' hours '
    minutes -= nb_hours * 60
  }
  if (minutes > 0) {
    result += minutes.toString() + ' mins'
  }
  return result
}

export type RacksDBAPIImage = ImageBitmapSource
export type RacksDBAPIResult = RacksDBAPIImage
export type RacksDBInfrastructureCoordinates = Record<string, [number, number, number, number]>
const GatewayGenericAPIKeys = ['clusters', 'users', 'message_login'] as const
export type GatewayGenericAPIKey = (typeof GatewayGenericAPIKeys)[number]
const GatewayClusterAPIKeys = [
  'stats',
  'nodes',
  'partitions',
  'qos',
  'reservations',
  'accounts'
] as const
export type GatewayClusterAPIKey = (typeof GatewayClusterAPIKeys)[number]
const GatewayClusterWithNumberAPIKeys = ['job'] as const
export type GatewayClusterWithNumberAPIKey = (typeof GatewayClusterWithNumberAPIKeys)[number]
const GatewayClusterWithStringAPIKeys = [
  'node',
  'jobs',
  'metrics_nodes',
  'metrics_cores',
  'metrics_jobs'
] as const
export type GatewayClusterWithStringAPIKey = (typeof GatewayClusterWithStringAPIKeys)[number]
export type GatewayAnyClusterApiKey =
  | GatewayClusterAPIKey
  | GatewayClusterWithNumberAPIKey
  | GatewayClusterWithStringAPIKey

export function useGatewayAPI() {
  const restAPI = useRESTAPI()
  const runtimeConfiguration = useRuntimeConfiguration()

  async function login(idents: loginIdents): Promise<GatewayLoginResponse> {
    try {
      return (await restAPI.post('/login', idents, false)) as GatewayLoginResponse
    } catch (error) {
      /* Translate 401 APIServerError into AuthenticationError */
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
      /* Translate 401 APIServerError into AuthenticationError */
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

  async function stats(cluster: string): Promise<ClusterStats> {
    return await restAPI.get<ClusterStats>(`/agents/${cluster}/stats`)
  }

  async function jobs(cluster: string, node?: string): Promise<ClusterJob[]> {
    if (node) return await restAPI.get<ClusterJob[]>(`/agents/${cluster}/jobs?node=${node}`)
    return await restAPI.get<ClusterJob[]>(`/agents/${cluster}/jobs`)
  }

  async function job(cluster: string, job: number): Promise<ClusterIndividualJob> {
    return await restAPI.get<ClusterIndividualJob>(`/agents/${cluster}/job/${job}`)
  }

  async function nodes(cluster: string): Promise<ClusterNode[]> {
    return await restAPI.get<ClusterNode[]>(`/agents/${cluster}/nodes`)
  }

  async function node(cluster: string, nodeName: string): Promise<ClusterIndividualNode> {
    return await restAPI.get<ClusterIndividualNode>(`/agents/${cluster}/node/${nodeName}`)
  }

  async function partitions(cluster: string): Promise<ClusterPartition[]> {
    return await restAPI.get<ClusterPartition[]>(`/agents/${cluster}/partitions`)
  }

  async function qos(cluster: string): Promise<ClusterQos[]> {
    return await restAPI.get<ClusterQos[]>(`/agents/${cluster}/qos`)
  }

  async function reservations(cluster: string): Promise<ClusterQos[]> {
    return await restAPI.get<ClusterQos[]>(`/agents/${cluster}/reservations`)
  }

  async function accounts(cluster: string): Promise<Array<AccountDescription>> {
    return await restAPI.get<AccountDescription[]>(`/agents/${cluster}/accounts`)
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

  async function metrics_jobs(
    cluster: string,
    last: string
  ): Promise<Record<MetricResourceState, MetricValue[]>> {
    return await restAPI.get<Record<MetricResourceState, MetricValue[]>>(
      `/agents/${cluster}/metrics/jobs?range=${last}`
    )
  }

  async function infrastructureImagePng(
    cluster: string,
    infrastructure: string,
    width: number,
    height: number
  ): Promise<[RacksDBAPIImage, RacksDBInfrastructureCoordinates]> {
    const response = await restAPI.postRaw<AxiosResponse>(
      `/agents/${cluster}/racksdb/draw/infrastructure/${infrastructure}.png?coordinates`,
      {
        general: { pixel_perfect: true },
        dimensions: { width: width, height: height },
        infrastructure: { equipment_labels: false, ghost_unselected: true },
        row: { labels: runtimeConfiguration.racksdb_rows_labels },
        rack: { labels: runtimeConfiguration.racksdb_racks_labels }
      },
      true,
      'arraybuffer'
    )
    // parse multipart response with Response.formData()
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

  function abort() {
    /* Abort all pending requests */
    console.log('Aborting requests')
    restAPI.abortController()
  }

  /*
   * Custom type guards for Gateway API keys
   */

  function isValidGatewayGenericAPIKey(key: string): key is GatewayGenericAPIKey {
    return typeof key === 'string' && GatewayGenericAPIKeys.includes(key as GatewayGenericAPIKey)
  }
  function isValidGatewayClusterAPIKey(key: string): key is GatewayClusterAPIKey {
    return typeof key === 'string' && GatewayClusterAPIKeys.includes(key as GatewayClusterAPIKey)
  }
  function isValidGatewayClusterWithStringAPIKey(
    key: string
  ): key is GatewayClusterWithStringAPIKey {
    return (
      typeof key === 'string' &&
      GatewayClusterWithStringAPIKeys.includes(key as GatewayClusterWithStringAPIKey)
    )
  }
  function isValidGatewayClusterWithNumberAPIKey(
    key: string
  ): key is GatewayClusterWithNumberAPIKey {
    return (
      typeof key === 'string' &&
      GatewayClusterWithNumberAPIKeys.includes(key as GatewayClusterWithNumberAPIKey)
    )
  }

  return {
    login,
    anonymousLogin,
    message_login,
    clusters,
    users,
    stats,
    jobs,
    job,
    nodes,
    node,
    partitions,
    qos,
    reservations,
    accounts,
    metrics_nodes,
    metrics_cores,
    metrics_jobs,
    infrastructureImagePng,
    abort,
    isValidGatewayGenericAPIKey,
    isValidGatewayClusterAPIKey,
    isValidGatewayClusterWithStringAPIKey,
    isValidGatewayClusterWithNumberAPIKey
  }
}
