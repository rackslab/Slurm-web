<script setup lang="ts">
import { computed } from 'vue'
import type { PropType, Ref } from 'vue'
import {
  renderClusterOptionalNumber,
  renderClusterTRESHuman,
  renderWalltime
} from '@/composables/GatewayAPI'
import type { ClusterOptionalNumber, ClusterTRES } from '@/composables/GatewayAPI'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/20/solid'

export interface QosModalLimitDescription {
  id: string
  qos: string
  value: ClusterOptionalNumber | ClusterTRES[]
}

const props = defineProps({
  helpModalShow: {
    type: Boolean,
    required: true
  },
  limit: {
    type: Object as PropType<QosModalLimitDescription>
  }
})

const qosMessage: Ref<{ title: string; message: string }> = computed(() => {
  if (!props.limit) {
    return {
      title: 'Undefined',
      message: 'Undefined message'
    }
  }

  function isClusterTRES(value: any): value is ClusterTRES[] {
    return Array.isArray(value)
  }

  function ifValueDefined(message: string): string {
    if (!props.limit) {
      return 'N/A'
    }
    if (isClusterTRES(props.limit.value)) {
      return props.limit.value.length
        ? message
        : `Slurm does not enforce this limit with QOS ${props.limit.qos}.`
    } else {
      return props.limit.value.set
        ? message
        : `Slurm does not enforce this limit with QOS ${props.limit.qos}.`
    }
  }

  function renderValue(): string {
    if (!props.limit) {
      return 'N/A'
    }
    if (isClusterTRES(props.limit.value)) {
      return renderClusterTRESHuman(props.limit.value)
    } else {
      return renderClusterOptionalNumber(props.limit.value)
    }
  }

  switch (props.limit.id) {
    case 'GrpJobs':
      return {
        title: 'Maximum number of running jobs',
        message: ifValueDefined(
          `Slurm does not execute simultaneously more than ${renderValue()} jobs associated with this QOS ${
            props.limit.qos
          }.`
        )
      }
    case 'MaxSubmitJobsPerUser':
      return {
        title: 'Maximum number of jobs submitted per user',
        message: ifValueDefined(
          `Slurm does not accept a single user to submit more than ${renderValue()} jobs associated with this QOS ${
            props.limit.qos
          } in cluster queue.`
        )
      }
    case 'MaxSubmitJobsPerAccount':
      return {
        title: 'Maximum number of jobs submitted per account',
        message: ifValueDefined(
          `Slurm does not accept submission of more than ${renderValue()} jobs associated with this QOS ${
            props.limit.qos
          } per account in cluster queue.`
        )
      }
    case 'MaxJobsPerUser':
      return {
        title: 'Maximum number of running jobs per user',
        message: ifValueDefined(
          `Slurm does not execute simultaneously more than ${renderValue()} jobs associated with this QOS ${
            props.limit.qos
          } per single user.`
        )
      }
    case 'MaxJobsPerAccount':
      return {
        title: 'Maximum number of running jobs per account',
        message: ifValueDefined(
          `Slurm does not execute simultaneously more than ${renderValue()} jobs associated with this QOS ${
            props.limit.qos
          } per account.`
        )
      }
    case 'GrpTRES':
      return {
        title: 'Maximum quantity of resources allocated to jobs',
        message: ifValueDefined(
          `Slurm does not allocate simultaneously more than ${renderValue()} to jobs associated with this QOS ${
            props.limit.qos
          }.`
        )
      }
    case 'MaxTRESPerUser':
      return {
        title: 'Maximum quantity of resources allocated to jobs per user',
        message: ifValueDefined(
          `Slurm does not allocate simultaneously more than ${renderValue()} to jobs associated with this QOS ${
            props.limit.qos
          } per single user.`
        )
      }
    case 'MaxTRESPerAccount':
      return {
        title: 'Maximum quantity of resources allocated to jobs per account',
        message: ifValueDefined(
          `Slurm does not allocate simultaneously more than ${renderValue()} to jobs associated with this QOS ${
            props.limit.qos
          } per account.`
        )
      }
    case 'MaxTRESPerJob':
      return {
        title: 'Maximum quantity of resources allocated per job',
        message: ifValueDefined(
          `Slurm does not allocate more than ${renderValue()} per job associated with this QOS ${
            props.limit.qos
          }.`
        )
      }
    case 'MaxTRESPerNode':
      return {
        title: 'Maximum quantity of resources allocated per node',
        message: ifValueDefined(
          `Slurm does not allocate more than ${renderValue()} per node to jobs associated with this QOS ${
            props.limit.qos
          }.`
        )
      }
    case 'MaxWall':
      return {
        title: 'Maximum jobs time limit',
        message: ifValueDefined(
          `Slurm does not allow jobs requiring more than ${
            isClusterTRES(props.limit.value) ? 'N/A' : renderWalltime(props.limit.value)
          } with this QOS ${props.limit.qos}.`
        )
      }
    default:
      return {
        title: 'Undefined',
        message: 'Undefined message'
      }
  }
})
</script>

<template>
  <TransitionRoot as="template" :show="props.helpModalShow">
    <Dialog as="div" class="relative z-50" @close="$emit('closeHelpModal')">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div
          class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
        >
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
            >
              <div class="sm:flex sm:items-start">
                <div
                  class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10"
                >
                  <QuestionMarkCircleIcon class="h-6 w-6 text-blue-400" aria-hidden="true" />
                </div>
                <div v-if="limit" class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900"
                    >{{ qosMessage.title }} ({{ limit.id }})</DialogTitle
                  >
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">{{ qosMessage.message }}</p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:mt-0 sm:w-auto"
                  @click="$emit('closeHelpModal')"
                >
                  OK
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
