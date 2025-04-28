<!--
  Copyright (c) 2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useGatewayDataGetter } from '@/composables/DataGetter'
import { ExclamationTriangleIcon } from '@heroicons/vue/20/solid'
import { APIServerError } from '@/composables/HTTPErrors'

/*
 * This component displays the login service message. The message is displayed
 * in an iframe to avoid styles to be removed by tailwind. The HTML message
 * holds its own style rules that are fully honored in the iframe.
 */

const message = useGatewayDataGetter<string>('message_login', reportError)
const iframe = useTemplateRef<HTMLIFrameElement>('iframe')

function reportError(error: Error) {
  // The gateway API returns HTTP/404 is login service message is not defined.
  // Just ignore the error in the case. For other errrors, report the error
  // using default error handler provided by GatewayDataGetter.
  if (error instanceof APIServerError && error.status == 404) return
  message.defaultErrorHandler(error)
}

// Use computed value to have a ref that is never undefined.
const content = computed(() => {
  if (!message.loaded.value) {
    return ''
  }
  return message.data.value
})

// Adjust iframe height when its scrollHeight is updated after being loaded.
watch(
  () => iframe.value?.contentWindow?.document.body.scrollHeight,
  async () => {
    // Wait just a little the iframe content to be rendered to have the correct
    // scrollHeight.
    await new Promise((r) => setTimeout(r, 200))
    if (iframe.value && iframe.value.contentWindow) {
      iframe.value.height = iframe.value.contentWindow.document.body.scrollHeight + 'px'
    }
  }
)
</script>

<template>
  <div
    v-if="message.loaded.value"
    class="my-4 w-full rounded-md bg-yellow-50 p-4 shadow-lg sm:max-w-md"
  >
    <div class="flex">
      <div class="flex-shrink-0">
        <ExclamationTriangleIcon class="h-5 w-5 text-yellow-400" aria-hidden="true" />
      </div>
      <iframe
        ref="iframe"
        title="iframe Example 1"
        :srcdoc="content"
        width="100%"
        frameborder="0"
        scrolling="no"
      ></iframe>
    </div>
  </div>
</template>
