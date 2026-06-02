/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

export type { SlurmOptionalNumber, SlurmPreciseTime, SlurmTRES } from './basics'
export type {
  SlurmJob,
  SlurmJobComment,
  SlurmJobDetail,
  SlurmJobExitCode,
  SlurmJobGPUFields,
  SlurmJobStep,
  SlurmJobTime
} from './job'
export type { SlurmAcctJob, SlurmAcctJobState, SlurmAcctJobTime } from './acctJob'
export type {
  SlurmNode,
  SlurmNodeAllocatedState,
  SlurmNodeDetail,
  SlurmNodeGPU,
  SlurmNodeMainState
} from './node'
export type { SlurmQos } from './qos'
export type { SlurmAssociation, SlurmAccountTreeNode } from './association'
export type { SlurmPartition } from './partition'
export type { SlurmReservation } from './reservation'
