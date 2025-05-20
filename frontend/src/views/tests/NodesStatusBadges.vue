<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'

const badges = [
  {
    status: ['DOWN'],
    desc: 'Node down'
  },
  {
    status: ['IDLE'],
    desc: 'Node idle'
  },
  {
    status: ['ALLOCATED'],
    desc: 'Node allocated'
  },
  {
    status: ['MIXED'],
    desc: 'Node mixed'
  },
  {
    status: ['ERROR'],
    desc: 'Node error'
  },
  {
    status: ['FUTURE'],
    desc: 'Node future'
  },
  {
    status: ['MIXED', 'FAIL'],
    desc: 'Node failing'
  },
  {
    status: ['IDLE', 'FAIL'],
    desc: 'Node failed'
  },
  {
    status: ['ALLOCATED', 'DRAIN'],
    desc: 'Node allocated draining'
  },
  {
    status: ['MIXED', 'DRAIN'],
    desc: 'Node mixed draining'
  },
  {
    status: ['IDLE', 'DRAIN'],
    desc: 'Node drained'
  },
  {
    status: ['DOWN', 'NOT_RESPONDING'],
    desc: 'Node down, do not respond'
  },
  {
    status: ['IDLE', 'RESERVED'],
    desc: 'Node idle reserved'
  },
  {
    status: ['IDLE', 'UNDRAIN'],
    desc: 'Node idle undrained'
  },
  {
    status: ['FUTURE', 'CLOUD'],
    desc: 'Node future cloud'
  },
  {
    status: ['ALLOCATED', 'COMPLETING'],
    desc: 'Node allocated completing'
  },
  {
    status: ['IDLE', 'POWERED_DOWN'],
    desc: 'Node idle automatically powered on'
  },
  {
    status: ['IDLE', 'POWERING_UP'],
    desc: 'Node idle automatically powering up'
  },
  {
    status: ['IDLE', 'MAINTENANCE'],
    desc: 'Node idle in maintenance'
  },
  {
    status: ['MIXED', 'REBOOT_REQUESTED'],
    desc: 'Node mixed with reboot requested'
  },
  {
    status: ['IDLE', 'POWERING_DOWN'],
    desc: 'Node idle powering down'
  },
  {
    status: ['FUTURE', 'DYNAMIC_FUTURE'],
    desc: 'Future node dynamic'
  },
  {
    status: ['IDLE', 'REBOOT_ISSUED'],
    desc: 'Node idle with reboot issued'
  },
  {
    status: ['IDLE', 'PLANNED'],
    desc: 'Node idle with planned job'
  },
  {
    status: ['DOWN', 'INVALID_REG'],
    desc: 'Node down with invalid registration'
  },
  {
    status: ['IDLE', 'POWER_DOWN'],
    desc: 'Node idle manually powered down'
  },
  {
    status: ['IDLE', 'POWER_UP'],
    desc: 'Node idle manually powered up'
  },
  {
    status: ['MIXED', 'DRAIN', 'POWER_DRAIN'],
    desc: 'Node mixed manually powered down ASAP'
  },
  {
    status: ['FUTURE', 'DYNAMIC_NORM'],
    desc: 'Future node dynamic norm'
  }
]
</script>

<template>
  <div class="m-auto px-4 sm:px-6 lg:max-w-196">
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
                  Allocation
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
                  <NodeMainState :status="badge.status" />
                </td>
                <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                  <NodeAllocationState :status="badge.status" />
                </td>
                <td class="px-3 py-4 text-xs whitespace-nowrap text-gray-500">
                  {{ badge.status.join(', ') }}
                </td>
                <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                  {{ badge.desc }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
