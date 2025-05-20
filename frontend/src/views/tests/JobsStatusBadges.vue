<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'

/*
 * States descriptions found in array flag_bit_t PARSER_FLAG_ARRAY(JOB_STATE)[]
 * in src/plugins/data_parser/v0.0.<n>/parsers.c
 */

const badges = [
  {
    status: ['PENDING'],
    desc: 'Queued waiting for initiation'
  },
  {
    status: ['RUNNING'],
    desc: 'Allocated resources and executing'
  },
  {
    status: ['SUSPENDED'],
    desc: 'Allocated resources, execution suspended'
  },
  {
    status: ['COMPLETED'],
    desc: 'Completed execution successfully'
  },
  {
    status: ['CANCELLED'],
    desc: 'Cancelled by user'
  },
  {
    status: ['FAILED'],
    desc: 'Completed execution unsuccessfullyn'
  },
  {
    status: ['TIMEOUT'],
    desc: 'Terminated on reaching time limit'
  },
  {
    status: ['NODE_FAIL'],
    desc: 'Terminated on node failure'
  },
  {
    status: ['PREEMPTED'],
    desc: 'Terminated due to preemption'
  },
  {
    status: ['BOOT_FAIL'],
    desc: 'Terminated due to node boot failure'
  },
  {
    status: ['DEADLINE'],
    desc: 'Terminated on deadline'
  },
  {
    status: ['OUT_OF_MEMORY'],
    desc: 'Experienced out of memory error'
  },
  {
    status: ['FAILED', 'LAUNCH_FAILED'],
    desc: 'Job launch failed'
  },
  {
    status: ['PENDING', 'REQUEUED', 'RECONFIG_FAIL'],
    desc: 'Node configuration for job failed, not job state, just job requeue flag'
  },
  {
    status: ['PENDING', 'POWER_UP_NODE'],
    desc: 'Allocated powered down nodes, waiting for reboot'
  },
  {
    status: ['RUNNING', 'COMPLETING'],
    desc: 'Waiting for epilog completion'
  },
  {
    status: ['COMPLETED', 'STAGE_OUT'],
    desc: 'Staging out data (burst buffer)'
  },
  {
    status: ['PENDING', 'CONFIGURING'],
    desc: 'Allocated nodes booting'
  },
  {
    status: ['RUNNING', 'RESIZING'],
    desc: 'Size of job about to change, flag set before calling accounting functions immediately before job changes size'
  },
  {
    status: ['PENDING', 'REQUEUED'],
    desc: 'Requeue job in completing state'
  },
  {
    status: ['PENDING', 'REQUEUE_FED'],
    desc: 'Job being requeued by federation'
  },
  {
    status: ['PENDING', 'REQUEUE_HOLD'],
    desc: 'Requeue any job in hold'
  },
  {
    status: ['PENDING', 'RESV_DEL_HOLD'],
    desc: 'Job is being held'
  },
  {
    status: ['FAILED', 'SPECIAL_EXIT'],
    desc: 'Requeue an exit job in hold'
  },
  {
    status: ['RUNNING', 'STOPPED'],
    desc: 'Job is stopped state (holding resources, but sent SIGSTOP)'
  },
  {
    status: ['FAILED', 'REVOKED'],
    desc: 'Sibling job revoked'
  },
  {
    status: ['TIMEOUT', 'SIGNALING'],
    desc: 'Outgoing signal is pending'
  }
]
</script>

<template>
  <div class="m-auto px-4 sm:px-6 lg:max-w-256">
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                >
                  Badge
                </th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Description
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="badge in badges" :key="badge.desc">
                <td
                  class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0"
                >
                  <JobStatusBadge :status="badge.status" />
                </td>
                <td class="px-3 py-4 text-xs whitespace-nowrap text-gray-500">
                  {{ badge.status.join(', ') }}
                </td>
                <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">{{ badge.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
