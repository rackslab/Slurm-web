<script setup lang="ts">
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'
import { useTemplateStore } from '@/stores/template'
import { useClusterDataGetter, useGatewayDataGetter } from '@/composables/DataGetter'
import type { UserDescription, AccountDescription } from '@/composables/GatewayAPI'

const templateStore = useTemplateStore()

const props = defineProps({
  role: {
    type: String,
    required: true,
    validator(value: string) {
      return ['user', 'developer'].includes(value)
    }
  },
  accountOrLogin: {
    type: String,
    required: true,
    validator(value: string) {
      return ['Accounts', 'Logins'].includes(value)
    }
  },
  cluster: {
    type: String,
    required: true
  }
})

const accounts = useClusterDataGetter<AccountDescription[]>('accounts', props.cluster)
const logins = useGatewayDataGetter<UserDescription[]>('users')
</script>

<template>
  <Listbox
    as="div"
    :v-model="`templateStore.${props.role}${props.accountOrLogin}`"
    class="flex pt-5"
    multiple
  >
    <div class="w-[250px]">
      <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900">{{
        props.accountOrLogin
      }}</ListboxLabel>
      <p class="mt-1 text-sm text-gray-500">Select users by account</p>
    </div>
    <div class="relative mt-2">
      <ListboxButton
        class="relative h-[35px] w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-slurmweb sm:text-sm sm:leading-6 lg:w-[400px]"
      >
        <span class="flex items-center">
          <span class="block truncate">{{
            templateStore.userAccounts.map((userAccount) => `@${userAccount}`).join(', ')
          }}</span>
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="props.accountOrLogin == 'Accounts'">
          <ListboxOptions
            v-if="accounts.data"
            class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            <ListboxOption
              as="template"
              v-for="account in accounts.data.value"
              :key="account.name"
              :value="account.name"
              v-slot="{ active, selected }"
            >
              <li
                :class="[
                  active ? 'bg-slurmweb text-white' : 'text-gray-900',
                  'relative cursor-default select-none py-2 pl-3 pr-9'
                ]"
              >
                <div class="flex items-center">
                  <span :class="['truncate', selected && 'font-semibold']"
                    >@{{ account.name }}</span
                  >
                </div>

                <span
                  v-if="selected"
                  :class="[
                    active ? 'text-white' : 'text-slurmweb',
                    'absolute inset-y-0 right-0 flex items-center pr-4'
                  ]"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </div>

        <div v-else>
          <ListboxOptions
            v-if="logins.data"
            class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            <ListboxOption
              as="template"
              v-for="login in logins.data.value"
              :key="login.login"
              :value="login.login"
              v-slot="{ active, selected }"
            >
              <li
                :class="[
                  active ? 'bg-slurmweb text-white' : 'text-gray-900',
                  'relative cursor-default select-none py-2 pl-3 pr-9'
                ]"
              >
                <div class="flex">
                  <span :class="['truncate', selected && 'font-semibold']">
                    {{ login.fullname }}
                  </span>
                  <span
                    :class="[
                      'ml-2 truncate text-gray-500',
                      active ? 'text-indigo-200' : 'text-gray-500'
                    ]"
                  >
                    {{ login.login }}
                  </span>
                </div>

                <span
                  v-if="selected"
                  :class="[
                    active ? 'text-white' : 'text-indigo-600',
                    'absolute inset-y-0 right-0 flex items-center pr-4'
                  ]"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </div>
      </transition>
    </div>
  </Listbox>
</template>
