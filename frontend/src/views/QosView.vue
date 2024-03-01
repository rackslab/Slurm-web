<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { useClusterDataPoller } from '@/composables/DataPoller'
import {
  renderClusterOptionalNumber,
  renderClusterTRES,
  renderQosFlag,
  renderWalltime
} from '@/composables/GatewayAPI'
import type { ClusterQos, ClusterOptionalNumber, ClusterTRES } from '@/composables/GatewayAPI'
import InfoAlert from '@/components/InfoAlert.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import QosHelpModal from '@/components/qos/QosHelpModal.vue'
import type { QosModalLimitDescription } from '@/components/qos/QosHelpModal.vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const { data, unable } = useClusterDataPoller<ClusterQos[]>('qos', 10000)

const helpModalShow: Ref<boolean> = ref(false)
const modalQosLimit: Ref<QosModalLimitDescription | undefined> = ref()

function openHelpModal(qos: string, limit: string, value: ClusterOptionalNumber | ClusterTRES[]) {
  modalQosLimit.value = { id: limit, qos: qos, value: value }
  helpModalShow.value = true
}

function closeHelpModal() {
  helpModalShow.value = false
  modalQosLimit.value = undefined
}

function qosJobLimits(qos: ClusterQos) {
  return [
    {
      id: 'GrpJobs',
      label: 'Global',
      value: qos.limits.max.active_jobs.count
    },
    {
      id: 'MaxSubmitJobsPerUser',
      label: 'Submit / User',
      value: qos.limits.max.jobs.per.user
    },
    {
      id: 'MaxSubmitJobsPerAccount',
      label: 'Submit / Account',
      value: qos.limits.max.jobs.per.account
    },
    {
      id: 'MaxJobsPerUser',
      label: 'Max / User',
      value: qos.limits.max.jobs.active_jobs.per.user
    },
    {
      id: 'MaxJobsPerAccount',
      label: 'Max / Account',
      value: qos.limits.max.jobs.active_jobs.per.account
    }
  ]
}

function qosResourcesLimits(qos: ClusterQos) {
  return [
    {
      id: 'GrpTRES',
      label: 'Global',
      value: qos.limits.max.tres.total
    },
    {
      id: 'MaxTRESPerUser',
      label: 'Max / User',
      value: qos.limits.max.tres.per.user
    },
    {
      id: 'MaxTRESPerAccount',
      label: 'Max / Account',
      value: qos.limits.max.tres.per.account
    },
    {
      id: 'MaxTRESPerJob',
      label: 'Max / Job',
      value: qos.limits.max.tres.per.job
    },
    {
      id: 'MaxTRESPerNode',
      label: 'Max / Node',
      value: qos.limits.max.tres.per.node
    }
  ]
}
</script>

<template>
  <ClusterMainLayout :cluster="props.cluster" title="QOS">
    <div class="mx-auto flex items-center justify-between">
      <div class="px-4 py-16 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">QOS</h1>
        <p class="mt-4 max-w-xl text-sm font-light text-gray-600">QOS defined on cluster</p>
      </div>
    </div>
    <QosHelpModal
      :help-modal-show="helpModalShow"
      :limit="modalQosLimit"
      @close-help-modal="closeHelpModal"
    />
    <ErrorAlert v-if="unable"
      >Unable to retrieve qos from cluster
      <span class="font-medium">{{ props.cluster }}</span></ErrorAlert
    >
    <InfoAlert v-else-if="data?.length == 0"
      >No qos defined on cluster <span class="font-medium">{{ props.cluster }}</span></InfoAlert
    >
    <div v-else class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="py-3.5 pr-3 text-left align-top text-sm font-semibold text-gray-900 sm:pl-6 lg:min-w-[250px] lg:pl-8"
                >
                  Name
                </th>
                <th
                  scope="col"
                  class="w-24 px-3 py-3.5 text-left align-top text-sm font-semibold text-gray-900"
                >
                  Priority
                </th>
                <th
                  scope="col"
                  class="hidden w-72 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
                >
                  Jobs
                </th>
                <th
                  scope="col"
                  class="hidden w-72 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
                >
                  Resources
                </th>
                <th
                  scope="col"
                  class="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Time
                </th>
                <th
                  scope="col"
                  class="hidden w-12 px-3 py-3.5 text-left align-top text-sm font-semibold text-gray-900 2xl:table-cell"
                >
                  Flags
                </th>
                <th scope="col" class="w-12"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="qos in data" :key="qos.name" class="bg-white">
                <td class="whitespace-nowrap py-4 pr-3 text-sm text-gray-900 sm:pl-6 lg:pl-8">
                  <p class="text-base font-medium">{{ qos.name }}</p>
                  <p class="text-gray-500">{{ qos.description }}</p>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {{ qos.priority.number }}
                </td>
                <td class="hidden whitespace-nowrap px-3 py-4 text-sm lg:table-cell">
                  <dl>
                    <div
                      v-for="limit in qosJobLimits(qos)"
                      :key="limit.id"
                      :class="[
                        limit.value.set ? 'text-gray-800' : 'text-gray-400',
                        'invisible flex leading-relaxed hover:visible'
                      ]"
                    >
                      <button
                        @click="openHelpModal(qos.name, limit.id, limit.value)"
                        class="-ml-5 mr-1"
                      >
                        <QuestionMarkCircleIcon class="h-5 w-5 text-slurmweb" />
                      </button>
                      <dt class="visible">{{ limit.label }}:</dt>
                      <dd class="visible ml-2">
                        {{ renderClusterOptionalNumber(limit.value) }}
                      </dd>
                    </div>
                  </dl>
                </td>
                <td class="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                  <dl>
                    <div
                      v-for="limit in qosResourcesLimits(qos)"
                      :key="limit.id"
                      :class="[
                        limit.value.length > 0 ? 'text-gray-800' : 'text-gray-400',
                        'invisible flex items-baseline leading-relaxed hover:visible'
                      ]"
                    >
                      <button
                        @click="openHelpModal(qos.name, limit.id, limit.value)"
                        class="-ml-5 mr-1 self-center"
                      >
                        <QuestionMarkCircleIcon class="h-5 w-5 text-slurmweb" />
                      </button>
                      <dt class="visible">{{ limit.label }}:</dt>
                      <dd class="visible ml-2 font-mono text-xs">
                        {{ renderClusterTRES(limit.value) }}
                      </dd>
                    </div>
                  </dl>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <div
                    :class="[
                      qos.limits.max.wall_clock.per.job.set ? 'text-gray-800' : 'text-gray-400',
                      'invisible flex items-baseline leading-relaxed hover:visible'
                    ]"
                  >
                    <button
                      @click="openHelpModal(qos.name, 'MaxWall', qos.limits.max.wall_clock.per.job)"
                      class="-ml-5 mr-1 self-center"
                    >
                      <QuestionMarkCircleIcon class="h-5 w-5 text-slurmweb" />
                    </button>
                    <span class="visible">
                      {{ renderWalltime(qos.limits.max.wall_clock.per.job) }}
                    </span>
                  </div>
                </td>
                <td class="hidden px-3 py-4 text-sm text-gray-500 2xl:table-cell">
                  <span
                    v-for="flag in qos.flags"
                    :key="flag"
                    class="m-1 inline-flex items-center rounded-md bg-slurmweb-light/50 px-2 py-1 text-xs font-medium text-slurmweb-dark ring-1 ring-inset ring-slurmweb-dark/10"
                    >{{ renderQosFlag(flag) }}</span
                  >
                </td>
                <td
                  class="whitespace-nowrap py-4 pl-3 text-right text-sm text-gray-500 sm:pr-6 lg:pr-8"
                >
                  <RouterLink
                    :to="{
                      name: 'jobs',
                      params: { cluster: props.cluster },
                      query: { qos: qos.name }
                    }"
                    class="font-bold text-slurmweb hover:text-slurmweb-dark"
                    >View jobs</RouterLink
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ClusterMainLayout>
</template>
