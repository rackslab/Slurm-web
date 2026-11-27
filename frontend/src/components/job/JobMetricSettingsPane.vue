<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { computed } from 'vue'
import { DateTime } from 'luxon'
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  ChevronDownIcon,
  ClockIcon,
  CpuChipIcon,
  PresentationChartLineIcon,
  ServerStackIcon
} from '@heroicons/vue/20/solid'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import type { JobMetricDetailItem, JobMetricResource } from '@/composables/JobMetricsCharts'

/* Settings drawer of job metric chart in fullscreen view: detail per node or GPU,
 * selection of nodes or GPUs and time range. Time range bounds are timestamps in
 * seconds, undefined bounds select the job start and end. An empty selection
 * selects all nodes or GPUs. */
const { resource, items, jobStart, jobEnd } = defineProps<{
  resource: JobMetricResource
  items: JobMetricDetailItem[]
  jobStart: number
  jobEnd: number
}>()

/* Drawer is opened from the right side of the screen, like filters panels */
const open = defineModel<boolean>('open', { required: true })

const detail = defineModel<boolean>('detail', { required: true })
const selection = defineModel<string[]>('selection', { required: true })
const start = defineModel<number | undefined>('start')
const end = defineModel<number | undefined>('end')

const detailLabel = computed(() => (resource === 'gpu' ? 'Per GPU' : 'Per node'))
const itemsTitle = computed(() => (resource === 'gpu' ? 'GPUs' : 'Nodes'))

function isSelected(id: string): boolean {
  return selection.value.length === 0 || selection.value.includes(id)
}

function toggleItem(id: string) {
  const selected = items.map((item) => item.id).filter((itemId) => isSelected(itemId))
  const result = isSelected(id) ? selected.filter((itemId) => itemId !== id) : [...selected, id]
  // All items selected is represented by an empty selection, so that items
  // appearing later are also displayed. Keep at least one item selected.
  if (result.length === 0) return
  selection.value = result.length === items.length ? [] : result
}

function selectOnly(id: string) {
  selection.value = items.length === 1 ? [] : [id]
}

/* Format of datetime-local inputs, in local time */
const INPUT_FORMAT = "yyyy-LL-dd'T'HH:mm:ss"

function formatInput(timestamp: number): string {
  return DateTime.fromSeconds(timestamp).toFormat(INPUT_FORMAT)
}

function parseInput(value: string): number | undefined {
  const datetime = DateTime.fromISO(value)
  return datetime.isValid ? Math.floor(datetime.toSeconds()) : undefined
}

const startInput = computed(() => formatInput(start.value ?? jobStart))
const endInput = computed(() => formatInput(end.value ?? jobEnd))
const minInput = computed(() => formatInput(jobStart))
const maxInput = computed(() => formatInput(jobEnd))

/* Set start of time range, ignored when invalid or not before end, then the
 * input displays the current start again. Start of job is represented by
 * undefined. */
function setStart(input: HTMLInputElement) {
  const timestamp = parseInput(input.value)
  if (timestamp === undefined || timestamp >= (end.value ?? jobEnd)) {
    input.value = startInput.value
    return
  }
  start.value = timestamp <= jobStart ? undefined : timestamp
}

/* Set end of time range, ignored when invalid or not after start, then the input
 * displays the current end again. End of job is represented by undefined. */
function setEnd(input: HTMLInputElement) {
  const timestamp = parseInput(input.value)
  if (timestamp === undefined || timestamp <= (start.value ?? jobStart)) {
    input.value = endInput.value
    return
  }
  end.value = timestamp >= jobEnd ? undefined : timestamp
}

function resetRange() {
  start.value = undefined
  end.value = undefined
}

const buttonClasses =
  'relative inline-flex flex-1 items-center justify-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
const activeClasses = 'bg-slurmweb dark:bg-slurmweb-dark text-white'
const inactiveClasses =
  'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700'
/* Sections of the pane, with the same look as jobs and resources filters panels */
const sectionClasses = 'border-t border-gray-200 px-4 py-6 dark:border-gray-600'
const sectionButtonClasses =
  'flex w-full items-center justify-between px-2 py-3 text-sm text-gray-400'
const sectionIconClasses = '-mt-1 mr-2 -ml-1 h-8 w-8 rounded-full p-2 text-white'
const linkClasses = 'text-slurmweb dark:text-slurmweb-light text-xs font-medium hover:underline'
const inputClasses =
  'block w-full rounded-md border-0 bg-white px-2 py-1.5 text-xs text-gray-900 ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-slurmweb dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 dark:[color-scheme:dark]'
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-40" @close="open = false">
      <TransitionChild
        as="template"
        enter="ease-in-out duration-500"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in-out duration-500"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-400/50 transition-opacity dark:bg-gray-900/60" />
      </TransitionChild>

      <div class="fixed inset-0 z-40 flex">
        <TransitionChild
          as="template"
          enter="transition ease-in-out duration-300 transform"
          enter-from="translate-x-full"
          enter-to="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leave-from="translate-x-0"
          leave-to="translate-x-full"
        >
          <DialogPanel
            class="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl dark:bg-gray-700"
            data-testid="job-metric-settings"
          >
            <div class="flex items-center justify-between px-4">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Settings</h2>
              <button
                type="button"
                class="-mr-2 flex h-10 w-10 items-center justify-center rounded-md p-2 text-gray-400"
                data-testid="job-metric-settings-close"
                @click="open = false"
              >
                <span class="sr-only">Close settings</span>
                <XMarkIcon class="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div class="mt-4">
              <Disclosure
                as="div"
                :class="sectionClasses"
                :default-open="true"
                v-slot="{ open }"
                data-testid="job-metric-section-display"
              >
                <h3 class="-mx-2 -my-3 flow-root">
                  <DisclosureButton :class="sectionButtonClasses">
                    <span class="flex">
                      <PresentationChartLineIcon :class="[sectionIconClasses, 'bg-slurmweb']" />
                      <span class="font-medium text-gray-900 dark:text-gray-100">Display</span>
                    </span>
                    <span class="ml-6 flex items-center">
                      <ChevronDownIcon
                        :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                        aria-hidden="true"
                      />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel class="pt-6">
                  <span class="isolate flex rounded-md shadow-xs">
                    <button
                      type="button"
                      data-testid="job-metric-display-job"
                      :class="[
                        !detail ? activeClasses : inactiveClasses,
                        buttonClasses,
                        'rounded-l-md'
                      ]"
                      @click="detail = false"
                    >
                      Job
                    </button>
                    <button
                      type="button"
                      data-testid="job-metric-display-detail"
                      :class="[
                        detail ? activeClasses : inactiveClasses,
                        buttonClasses,
                        'rounded-r-md'
                      ]"
                      @click="detail = true"
                    >
                      {{ detailLabel }}
                    </button>
                  </span>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure
                v-if="detail"
                as="div"
                :class="sectionClasses"
                :default-open="true"
                v-slot="{ open }"
                data-testid="job-metric-items"
              >
                <h3 class="-mx-2 -my-3 flow-root">
                  <DisclosureButton :class="sectionButtonClasses">
                    <span class="flex">
                      <CpuChipIcon
                        v-if="resource === 'gpu'"
                        :class="[sectionIconClasses, 'bg-purple-600']"
                      />
                      <ServerStackIcon v-else :class="[sectionIconClasses, 'bg-amber-700']" />
                      <span class="font-medium text-gray-900 dark:text-gray-100">{{
                        itemsTitle
                      }}</span>
                    </span>
                    <span class="ml-6 flex items-center">
                      <ChevronDownIcon
                        :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                        aria-hidden="true"
                      />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel class="pt-6">
                  <div v-if="selection.length" class="mb-3 flex justify-end">
                    <button
                      type="button"
                      :class="linkClasses"
                      data-testid="job-metric-items-all"
                      @click="selection = []"
                    >
                      Select all
                    </button>
                  </div>
                  <p v-if="!items.length" class="text-sm text-gray-400">No data available</p>
                  <ul class="space-y-4">
                    <li
                      v-for="item in items"
                      :key="item.id"
                      class="group flex items-center justify-between"
                    >
                      <label class="flex min-w-0 items-center">
                        <input
                          type="checkbox"
                          class="text-slurmweb focus:ring-slurmweb h-4 w-4 rounded-sm border-gray-300"
                          :data-testid="`job-metric-item-${item.id}`"
                          :checked="isSelected(item.id)"
                          @change="toggleItem(item.id)"
                        />
                        <span class="ml-3 truncate text-sm text-gray-500 dark:text-gray-300">{{
                          item.label
                        }}</span>
                      </label>
                      <button
                        type="button"
                        class="hidden text-xs text-gray-400 group-hover:inline hover:text-gray-600 dark:hover:text-gray-200"
                        :data-testid="`job-metric-item-only-${item.id}`"
                        @click="selectOnly(item.id)"
                      >
                        only
                      </button>
                    </li>
                  </ul>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure
                as="div"
                :class="sectionClasses"
                :default-open="true"
                v-slot="{ open }"
                data-testid="job-metric-section-range"
              >
                <h3 class="-mx-2 -my-3 flow-root">
                  <DisclosureButton :class="sectionButtonClasses">
                    <span class="flex">
                      <ClockIcon :class="[sectionIconClasses, 'bg-gray-600 dark:bg-gray-500']" />
                      <span class="font-medium text-gray-900 dark:text-gray-100">Time range</span>
                    </span>
                    <span class="ml-6 flex items-center">
                      <ChevronDownIcon
                        :class="[open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform']"
                        aria-hidden="true"
                      />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel class="pt-6">
                  <div
                    v-if="start !== undefined || end !== undefined"
                    class="mb-3 flex justify-end"
                  >
                    <button
                      type="button"
                      :class="linkClasses"
                      data-testid="job-metric-range-reset"
                      @click="resetRange()"
                    >
                      Whole job
                    </button>
                  </div>
                  <label
                    class="mb-1 block text-xs text-gray-500 dark:text-gray-300"
                    for="job-metric-start"
                    >From</label
                  >
                  <input
                    id="job-metric-start"
                    type="datetime-local"
                    step="1"
                    :class="inputClasses"
                    data-testid="job-metric-range-start"
                    :value="startInput"
                    :min="minInput"
                    :max="endInput"
                    @change="setStart($event.target as HTMLInputElement)"
                  />
                  <label
                    class="mt-3 mb-1 block text-xs text-gray-500 dark:text-gray-300"
                    for="job-metric-end"
                    >To</label
                  >
                  <input
                    id="job-metric-end"
                    type="datetime-local"
                    step="1"
                    :class="inputClasses"
                    data-testid="job-metric-range-end"
                    :value="endInput"
                    :min="startInput"
                    :max="maxInput"
                    @change="setEnd($event.target as HTMLInputElement)"
                  />
                </DisclosurePanel>
              </Disclosure>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
