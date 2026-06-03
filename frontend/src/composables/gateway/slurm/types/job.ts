/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber, SlurmPreciseTime, SlurmTRES } from './basics'

export interface SlurmJobComment {
  administrator: string
  job: string
  system: string
}

export interface SlurmJobExitCode {
  return_code: SlurmOptionalNumber
  signal: { id: SlurmOptionalNumber; name: string }
  status: string[]
}

export interface SlurmJobTime {
  elapsed: number
  eligible: number
  end: number
  limit: SlurmOptionalNumber
  planned: SlurmOptionalNumber
  start: number
  submission: number
  suspended: number
  system: SlurmPreciseTime
  total: SlurmPreciseTime
  user: SlurmPreciseTime
}

interface SlurmAccountedResources {
  average: SlurmTRES[]
  max: SlurmTRES[]
  min: SlurmTRES[]
  total: SlurmTRES[]
}

export interface SlurmJobStep {
  CPU: {
    governor: string
    requested_frequency: { max: SlurmOptionalNumber; min: SlurmOptionalNumber }
  }
  exit_code: SlurmJobExitCode
  kill_request_user: string
  nodes: { count: number; list: string[]; range: string }
  pid: string
  state: string[]
  statistics: { CPU: { actual_frequency: number }; energy: { consumed: SlurmOptionalNumber } }
  step: { id: string; name: string }
  task: { distribution: string }
  tasks: { count: number }
  time: {
    elapsed: number
    end: SlurmOptionalNumber
    start: SlurmOptionalNumber
    suspended: number
    system: SlurmPreciseTime
    total: SlurmPreciseTime
    user: SlurmPreciseTime
  }
  tres: {
    allocated: SlurmTRES[]
    consumed: SlurmAccountedResources
    requested: SlurmAccountedResources
  }
}

export interface SlurmJob {
  account: string
  cpus: SlurmOptionalNumber
  gres_detail: string[]
  job_id: number
  name: string
  job_state: string[]
  node_count: SlurmOptionalNumber
  nodes: string
  partition: string
  priority: SlurmOptionalNumber
  qos: string
  sockets_per_node: SlurmOptionalNumber
  state_reason: string
  tasks: SlurmOptionalNumber
  tres_per_job: string
  tres_per_node: string
  tres_per_socket: string
  tres_per_task: string
  user_name: string
}

export interface SlurmJobDetail {
  accrue_time?: SlurmOptionalNumber
  association: { account: string; cluster: string; id: number; partition: string; user: string }
  batch_flag?: boolean
  command?: string
  comment: SlurmJobComment
  cpus?: SlurmOptionalNumber
  current_working_directory?: string
  derived_exit_code: SlurmJobExitCode
  shared?: string[]
  exit_code: SlurmJobExitCode
  gres_detail?: string[]
  group: string
  last_sched_evaluation?: SlurmOptionalNumber
  name: string
  node_count?: SlurmOptionalNumber
  nodes: string
  partition: string
  priority: SlurmOptionalNumber
  qos: string
  script: string
  sockets_per_node?: SlurmOptionalNumber
  stderr_expanded?: string
  stdin_expanded?: string
  stdout_expanded?: string
  state: { current: string[]; reason: string }
  steps: SlurmJobStep[]
  submit_line: string
  tasks?: SlurmOptionalNumber
  time: SlurmJobTime
  tres: { allocated: SlurmTRES[]; requested: SlurmTRES[] }
  tres_per_job?: string
  tres_per_node?: string
  tres_per_socket?: string
  tres_per_task?: string
  tres_req_str?: string
  user: string
  wckey: { flags: string[]; wckey: string }
  working_directory: string
}

/** GPU and resource fields shared by list and detail job records. */
export interface SlurmJobGPUFields {
  gres_detail?: string[]
  node_count?: SlurmOptionalNumber
  sockets_per_node?: SlurmOptionalNumber
  tasks?: SlurmOptionalNumber
  tres_per_job?: string
  tres_per_node?: string
  tres_per_socket?: string
  tres_per_task?: string
  tres?: { allocated: SlurmTRES[]; requested: SlurmTRES[] }
}
