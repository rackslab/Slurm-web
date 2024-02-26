<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { RouteRecordName } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
const props = defineProps({
  cluster: {
    type: String,
    required: true
  }
})

const route = useRoute()
const runtimeStore = useRuntimeStore()
</script>

<template>
  <template v-if="runtimeStore.availableClusters.length > 1">
    <Popover class="relative">
      <PopoverButton
        class="inline-flex items-center gap-x-1 rounded p-3 font-bold leading-6 text-transparent hover:bg-slurmweb-light hover:text-gray-400"
      >
        <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
        <span class="text-gray-700 hover:text-gray-900">{{ props.cluster }}</span>
      </PopoverButton>

      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <PopoverPanel
          v-slot="{ close }"
          class="absolute left-0 z-10 mt-5 flex w-screen max-w-max px-0"
        >
          <div
            class="w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5"
          >
            <div class="p-4">
              <div
                v-for="cluster in runtimeStore.availableClusters"
                :key="cluster.name"
                class="group relative flex gap-x-6 rounded-lg p-4 hover:bg-gray-50"
              >
                <div
                  v-if="cluster.permissions.actions.length > 0"
                  class="mt-1 flex items-center justify-evenly gap-x-1.5"
                >
                  <div
                    :class="[
                      cluster.stats ? 'bg-emerald-500/20' : 'bg-orange-500/20',
                      'flex-none rounded-full  p-1'
                    ]"
                  >
                    <div
                      :class="[
                        cluster.stats ? 'bg-emerald-500' : 'bg-orange-500',
                        'h-1.5 w-1.5 rounded-full bg-emerald-500'
                      ]"
                    />
                  </div>
                </div>

                <RouterLink
                  :to="{
                    name: route.name as RouteRecordName,
                    params: { cluster: cluster.name },
                    query: route.query
                  }"
                  class="flex flex-grow font-semibold text-gray-900"
                  @click="close()"
                >
                  {{ cluster.name }}
                  <span class="absolute inset-0" />
                </RouterLink>

                <span v-if="cluster.stats" class="w-30 mt-1 flex text-xs leading-5 text-gray-500">
                  <CpuChipIcon class="mx-1 h-5" />
                  {{ cluster.stats.resources.nodes }} node{{
                    cluster.stats.resources.nodes > 1 ? 's' : ''
                  }}
                </span>
              </div>
            </div>
          </div>
        </PopoverPanel>
      </transition>
    </Popover>
  </template>
  <span
    v-else
    class="inline-flex items-center gap-x-1 rounded p-3 font-bold leading-6 text-gray-700"
  >
    {{ props.cluster }}
  </span>
</template>
