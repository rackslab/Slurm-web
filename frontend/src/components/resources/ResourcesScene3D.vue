<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// Micro icons, designed to be displayed at 16px in buttons
import {
  ArrowPathIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  ViewfinderCircleIcon
} from '@heroicons/vue/16/solid'
import { useRuntimeStore } from '@/stores/runtime'
import type { ResourcesRepresentation } from '@/stores/runtime/resources'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { APIServerError } from '@/composables/HTTPErrors'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import type { CameraMode, ResourcesViewer } from '@/lib/resources3d/viewer'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ResourcesNodeTooltip from '@/components/resources/ResourcesNodeTooltip.vue'
import MouseButtonIcon from '@/components/resources/MouseButtonIcon.vue'
import KeyCap from '@/components/resources/KeyCap.vue'
import ArrowKeys from '@/components/resources/ArrowKeys.vue'

const {
  cluster,
  nodes,
  mode = 'nodes'
} = defineProps<{
  cluster: string
  nodes: SlurmNode[]
  mode?: ResourcesRepresentation
}>()

const router = useRouter()
const route = useRoute()
const runtimeStore = useRuntimeStore()
const gateway = useGatewayAPI()

const container = useTemplateRef<HTMLDivElement>('container')
const loading = ref(true)
const errorMessage: Ref<string | null> = ref(null)
const cameraMode: Ref<CameraMode> = ref('free')
// Help of mouse and keyboard controls, hidden by default
const showHelp = ref(false)
const hovered: Ref<{ name: string; x: number; y: number } | null> = ref(null)

const hoveredNode = computed(() =>
  hovered.value ? nodes.find((node) => node.name === hovered.value?.name) : undefined
)

let viewer: ResourcesViewer | null = null
// Incremented on every (re)load and on unmount, to discard results of
// outdated loads.
let generation = 0

function reportError(error: unknown) {
  if (error instanceof APIServerError) {
    errorMessage.value = `Unable to retrieve 3D representation of cluster ${cluster}: API server error (${error.status}): ${error.message}`
  } else if (error instanceof Error) {
    errorMessage.value = `Unable to display 3D representation of cluster ${cluster}: ${error.message}`
  } else {
    errorMessage.value = `Unable to display 3D representation of cluster ${cluster}`
  }
}

function disposeViewer() {
  viewer?.dispose()
  viewer = null
  hovered.value = null
  cameraMode.value = 'free'
}

async function load() {
  const current = ++generation
  disposeViewer()
  loading.value = true
  errorMessage.value = null
  try {
    const data = await gateway.infrastructureGlb(
      cluster,
      runtimeStore.getCluster(cluster).infrastructure
    )
    // Load three.js and the viewer dynamically, only when the 3D view is displayed.
    const { createResourcesViewer } = await import('@/lib/resources3d/viewer')
    if (current !== generation) return
    // Show container before creating viewer, so it can measure its size.
    loading.value = false
    await nextTick()
    if (current !== generation || !container.value) return
    const created = await createResourcesViewer(container.value, data, {
      onHover: (name, x, y) => {
        hovered.value = name ? { name, x, y } : null
      },
      onSelect: (name) => {
        router.push({
          name: 'node',
          params: { cluster, nodeName: name },
          query: { returnTo: route.name as string }
        })
      },
      onCameraModeChange: (value) => {
        cameraMode.value = value
      }
    })
    // Component may have been unmounted or cluster changed while loading.
    if (current !== generation) {
      created.dispose()
      return
    }
    viewer = created
    viewer.setNodes(nodes, mode)
  } catch (error: unknown) {
    if (current !== generation) return
    reportError(error)
  } finally {
    if (current === generation) loading.value = false
  }
}

// Camera buttons give the keyboard focus back to the scene, so arrows keep
// moving the camera after clicking them.
function setCameraMode(value: CameraMode) {
  viewer?.setCameraMode(value)
  viewer?.focusKeyboard()
}

function resetCamera() {
  viewer?.resetCamera()
  viewer?.focusKeyboard()
}

function toggleHelp() {
  showHelp.value = !showHelp.value
  viewer?.focusKeyboard()
}

watch(
  () => [nodes, mode] as const,
  () => {
    viewer?.setNodes(nodes, mode)
  }
)

watch(
  () => cluster,
  () => {
    load()
  }
)

onMounted(() => {
  load()
})

onUnmounted(() => {
  generation++
  disposeViewer()
})

const buttonClasses =
  'relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
const activeClasses = 'bg-slurmweb dark:bg-slurmweb-dark text-white'
const inactiveClasses =
  'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700'
</script>

<template>
  <div class="relative min-h-96 min-w-full grow" data-testid="resources-scene-3d">
    <div v-if="loading" class="text-slurmweb absolute inset-0 flex items-center justify-center">
      <LoadingSpinner :size="8" />
    </div>
    <div v-else-if="errorMessage" class="px-6">
      <ErrorAlert class="mt-4">{{ errorMessage }}</ErrorAlert>
    </div>
    <template v-else>
      <div ref="container" class="absolute inset-0" />

      <div class="absolute top-4 left-6 flex gap-2">
        <span class="isolate inline-flex rounded-md shadow-xs">
          <button
            type="button"
            data-testid="resources-scene-camera-free"
            title="Free camera"
            :class="[
              cameraMode === 'free' ? activeClasses : inactiveClasses,
              buttonClasses,
              'rounded-l-md'
            ]"
            @click="setCameraMode('free')"
          >
            <ViewfinderCircleIcon class="h-4 w-4" aria-hidden="true" />
            <span class="sr-only">Free camera</span>
          </button>
          <button
            type="button"
            data-testid="resources-scene-camera-turntable"
            title="Orbit racks"
            :class="[
              cameraMode === 'turntable' ? activeClasses : inactiveClasses,
              buttonClasses,
              'rounded-r-md'
            ]"
            @click="setCameraMode('turntable')"
          >
            <ArrowPathIcon class="h-4 w-4" aria-hidden="true" />
            <span class="sr-only">Orbit racks</span>
          </button>
        </span>
        <button
          type="button"
          data-testid="resources-scene-camera-reset"
          title="Reset view"
          :class="[inactiveClasses, buttonClasses, 'rounded-md shadow-xs']"
          @click="resetCamera"
        >
          <HomeIcon class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Reset view</span>
        </button>
      </div>

      <div class="pointer-events-none absolute bottom-4 left-6 flex flex-col items-start gap-2">
        <div
          v-if="showHelp"
          id="resources-scene-help"
          data-testid="resources-scene-help"
          class="flex flex-col gap-1.5 rounded-md bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-md ring-1 ring-gray-300 dark:bg-gray-800/90 dark:text-gray-300 dark:ring-gray-600"
        >
          <template v-if="cameraMode === 'free'">
            <p
              data-testid="resources-scene-help-mouse"
              class="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <span class="inline-flex items-center gap-1.5">
                <MouseButtonIcon button="left" /><span class="sr-only">Left drag:</span> rotate
              </span>
              <span class="inline-flex items-center gap-1.5">
                <MouseButtonIcon button="right" /><span class="sr-only">Right drag:</span> pan
              </span>
              <span class="inline-flex items-center gap-1.5">
                <MouseButtonIcon button="wheel" /><span class="sr-only">Scroll:</span> zoom
              </span>
            </p>
            <p
              data-testid="resources-scene-help-keyboard"
              class="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <span class="inline-flex items-center gap-1.5">
                <ArrowKeys />
                move
              </span>
              <span class="inline-flex items-center gap-1">
                <KeyCap>Shift</KeyCap>+
                <ArrowKeys directions="vertical" />
                <span class="ml-0.5">up/down</span>
              </span>
              <span class="inline-flex items-center gap-1">
                <KeyCap>Ctrl</KeyCap>+
                <ArrowKeys />
                <span class="ml-0.5">rotate</span>
              </span>
            </p>
          </template>
          <p
            v-else
            data-testid="resources-scene-help-turntable"
            class="inline-flex items-center gap-1.5"
          >
            <MouseButtonIcon button="wheel" /><span class="sr-only">Scroll:</span> zoom
          </p>
        </div>
        <button
          type="button"
          data-testid="resources-scene-help-toggle"
          :title="showHelp ? 'Hide controls help' : 'Show controls help'"
          :aria-expanded="showHelp"
          aria-controls="resources-scene-help"
          :class="[
            showHelp
              ? activeClasses
              : 'bg-white/90 text-gray-600 hover:bg-white dark:bg-gray-800/90 dark:text-gray-300 hover:dark:bg-gray-800',
            'pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full shadow-md ring-1 ring-gray-300 dark:ring-gray-600'
          ]"
          @click="toggleHelp"
        >
          <QuestionMarkCircleIcon class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">{{ showHelp ? 'Hide' : 'Show' }} controls help</span>
        </button>
      </div>

      <aside
        v-if="hovered && hoveredNode"
        data-testid="resources-scene-tooltip"
        class="pointer-events-none absolute -translate-x-1/2 -translate-y-full pb-4"
        :style="{ left: `${hovered.x}px`, top: `${hovered.y}px` }"
      >
        <ResourcesNodeTooltip :node="hoveredNode" :mode="mode" />
        <div
          class="absolute right-0 left-0 m-auto h-0 w-0 border-x-[12px] border-t-[10px] border-x-transparent border-t-white dark:border-t-gray-800"
        ></div>
      </aside>
    </template>
  </div>
</template>
