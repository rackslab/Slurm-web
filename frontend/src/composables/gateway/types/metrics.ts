/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

export type MetricValue = [number, number]

const MetricRanges = ['week', 'day', 'hour'] as const
export type MetricRange = (typeof MetricRanges)[number]

export type MetricResourceState =
  | 'idle'
  | 'mixed'
  | 'allocated'
  | 'drain'
  | 'down'
  | 'error'
  | 'fail'
  | 'unknown'

export type MetricJobState =
  | 'running'
  | 'pending'
  | 'completing'
  | 'completed'
  | 'cancelled'
  | 'suspended'
  | 'preempted'
  | 'failed'
  | 'timeout'
  | 'node_fail'
  | 'boot_fail'
  | 'deadline'
  | 'out_of_memory'
  | 'unknown'

export type MetricCacheResult = 'hit' | 'miss'

/* Metrics of resources usage by individual jobs:
 * - cpu: CPU usage in percent of allocated CPUs
 * - memory: memory usage in bytes
 * - memory_allocated: memory allocated to the job in bytes
 * - gpu: GPU usage in percent, averaged over allocated GPUs
 * - gpu_memory: GPU memory usage in percent, averaged over allocated GPUs
 */
export type JobMetric = 'cpu' | 'memory' | 'memory_allocated' | 'gpu' | 'gpu_memory'
export type JobMetrics = Partial<Record<JobMetric, MetricValue[]>>

export function isMetricRange(range: unknown): range is MetricRange {
  return typeof range === 'string' && MetricRanges.includes(range as MetricRange)
}
