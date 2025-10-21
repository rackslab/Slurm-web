<!--
  Copyright (c) 2023-2024 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { ClusterNode, RacksDBInfrastructureCoordinates } from '@/composables/GatewayAPI'
import { APIServerError } from '@/composables/HTTPErrors'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const {
  cluster,
  nodes,
  fullscreen,
  mode,
  loading: nodesLoading
} = defineProps<{
  cluster: string
  nodes: ClusterNode[]
  fullscreen: boolean
  mode?: 'nodes' | 'cores'
  loading?: boolean
}>()

const emit = defineEmits(['imageSize'])
const unable = defineModel({ required: true, default: false })

const router = useRouter()
const route = useRoute()
const runtimeStore = useRuntimeStore()
const gateway = useGatewayAPI()

const container = useTemplateRef<HTMLDivElement>('container')
const racksLoading: Ref<boolean> = ref(true)
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const nodeTooltip = useTemplateRef<HTMLDivElement>('nodeTooltip')
const nodeTooltipOpen: Ref<boolean> = ref(false)
const errorMessage: Ref<string | undefined> = ref()
let timeout: number = -1 // holder for timeout id
const delay = 250 // delay after event is "complete" to run callback
let animationId: number | null = null // holder for animation frame id
let allNodesPaths: Record<
  string,
  { x: number; y: number; width: number; height: number; path: Path2D }
> = {}
const currentNode: Ref<ClusterNode | undefined> = ref()
let previousPath: Path2D | undefined = undefined
let coordinates: RacksDBInfrastructureCoordinates | undefined = undefined
let image: ImageBitmapSource | undefined = undefined
let bitmap: ImageBitmap | undefined = undefined
let x_shift: number = 0
let y_shift: number = 1

function getClusterNode(nodeName: string): ClusterNode | undefined {
  try {
    return nodes.filter((node) => node.name == nodeName)[0]
  } catch (error) {
    if (error instanceof Error)
      console.log(`Error ${error.name} in getClusterNode(${nodeName}): ${error.message}`)
    return undefined
  }
}

function getNodeState(nodeName: string): string[] {
  return getClusterNode(nodeName)?.state || []
}

function inSelectedNodes(nodeName: string): boolean {
  return getClusterNode(nodeName) !== undefined
}

function reportAPIServerError(error: APIServerError) {
  errorMessage.value = `API server error (${error.status}): ${error.message}`
  unable.value = true
}

function reportOtherError(error: Error) {
  errorMessage.value = `Server error: ${error.message}`
  unable.value = true
}

function getNodeStrokeColor(states: string[]): string | undefined {
  const strokeColors = {
    DOWN: '#c10007',
    DRAINING: '#b380c4',
    DRAIN: '#b654d6'
  }
  for (const [status, color] of Object.entries(strokeColors)) {
    if (states.includes(status)) {
      return color
    }
  }
  return undefined
}

function getNodeFillColor(states: string[]): string {
  const fillColors = {
    DOWN: '#c10007',
    IDLE: '#70e079',
    MIXED: '#ffd230',
    ALLOCATED: '#e17100'
  }
  let fillColor = '#ffffff'
  for (const [status, color] of Object.entries(fillColors)) {
    if (states.includes(status)) {
      fillColor = color
      break
    }
  }
  return fillColor
}

function drawNodeHoverRing(ctx: CanvasRenderingContext2D, nodePath: Path2D): void {
  ctx.strokeStyle = '#74a5d6' // hover color
  ctx.stroke(nodePath)
}

function drawNodeStroke(
  ctx: CanvasRenderingContext2D,
  node_x: number,
  node_y: number,
  node_width: number,
  node_height: number,
  strokeColor: string
): void {
  ctx.strokeStyle = strokeColor
  // Define stroke width depending on node height
  if (node_height > 10) {
    ctx.lineWidth = 5
  } else {
    ctx.lineWidth = 2
  }
  ctx.strokeRect(
    node_x + ctx.lineWidth / 2,
    node_y + ctx.lineWidth / 2,
    node_width - ctx.lineWidth - 1,
    node_height - ctx.lineWidth
  )
  ctx.lineWidth = 1
}

function getNodeCoresUsage(nodeName: string): {
  allocated: number
  total: number
  percentage: number
} {
  const node = getClusterNode(nodeName)
  if (!node) return { allocated: 0, total: 0, percentage: 0 }

  const allocated = node.alloc_cpus || 0
  const total = node.cpus || 0
  const percentage = total > 0 ? (allocated / total) * 100 : 0

  return { allocated, total, percentage }
}

function progressBarColor(percentage: number): string {
  if (percentage == 100) return '#f54900'
  else if (percentage >= 80) return '#fe9a00'
  else if (percentage >= 30) return '#ffd230'
  else return '#7ccf00'
}

function drawCoresProgressBar(
  ctx: CanvasRenderingContext2D,
  node_x: number,
  node_y: number,
  node_width: number,
  node_height: number,
  coresUsage: { allocated: number; total: number; percentage: number }
): void {
  // Determine if node is wider than tall
  const isHorizontal = node_width > node_height
  const backgroundColor = '#e5e7eb' // gray-200

  if (isHorizontal) {
    // Horizontal progress bar (left to right)
    const barWidth = node_width - 1
    const barHeight = node_height
    const barX = node_x
    const barY = node_y + (node_height - barHeight) / 2

    // Background bar
    ctx.fillStyle = backgroundColor
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Progress bar
    const progressWidth = barWidth * (coresUsage.percentage / 100)
    if (progressWidth > 0) {
      ctx.fillStyle = progressBarColor(coresUsage.percentage)
      ctx.fillRect(barX, barY, progressWidth, barHeight)
    }
  } else {
    // Vertical progress bar (bottom to top)
    const barWidth = node_width - 1
    const barHeight = node_height
    const barX = node_x + (node_width - barWidth) / 2
    const barY = node_y

    // Background bar
    ctx.fillStyle = backgroundColor
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Progress bar (from bottom)
    const progressHeight = barHeight * (coresUsage.percentage / 100)
    if (progressHeight > 0) {
      ctx.fillStyle = progressBarColor(coresUsage.percentage)
      ctx.fillRect(barX, barY + barHeight - progressHeight, barWidth, progressHeight)
    }
  }
}

function drawCoresTextOverlay(
  ctx: CanvasRenderingContext2D,
  node_x: number,
  node_y: number,
  node_width: number,
  node_height: number,
  coresUsage: { allocated: number; total: number; percentage: number }
): void {
  const textColor = '#374151' // gray-700
  const isHorizontal = node_width > node_height

  if (isHorizontal) {
    // Horizontal text overlay - aligned to right
    if (node_width > 60 && node_height > 10) {
      ctx.fillStyle = textColor
      const fontSize = Math.min(node_height - 4, 12)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `${coresUsage.allocated}/${coresUsage.total}`,
        node_x + node_width - 2,
        node_y + node_height / 2 + 1
      )
    }
  } else {
    // Vertical text overlay - aligned to top
    if (node_width > 10 && node_height > 20) {
      ctx.fillStyle = textColor
      const fontSize = Math.min(node_width - 4, 12)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(node_x + node_width / 2 + 1, node_y + 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(`${coresUsage.allocated}/${coresUsage.total}`, 0, 0)
      ctx.restore()
    }
  }
}

function drawShimmerAnimation(ctx: CanvasRenderingContext2D, time: number): void {
  if (!bitmap || !canvas.value || !coordinates) return

  const shimmerSpeed = 0.001
  const shimmerWidth = canvas.value.height * 0.1

  // Calculate global shimmer position across entire canvas (top to bottom)
  const canvasHeight = canvas.value.height
  const shimmerProgress = (time * shimmerSpeed) % 1
  const globalShimmerY = canvasHeight * shimmerProgress

  // Apply shimmer effect to each node
  for (const [, nodeCoordinates] of Object.entries(coordinates)) {
    const node_x = nodeCoordinates[0] + x_shift + 0.5
    const node_y = nodeCoordinates[1] + y_shift - 0.5
    const node_width = nodeCoordinates[2] - 1
    const node_height = nodeCoordinates[3]

    // Calculate shimmer intensity for this node based on global vertical position
    let shimmerIntensity = 0
    if (globalShimmerY > node_y && globalShimmerY < node_y + node_height) {
      // Shimmer is within node bounds
      shimmerIntensity = 1
    } else if (globalShimmerY > node_y - shimmerWidth && globalShimmerY <= node_y) {
      // Shimmer is entering from top - intensity higher when closer to global shimmer Y
      const distanceFromShimmer = Math.abs(globalShimmerY - node_y)
      const maxDistance = shimmerWidth
      const proximityFactor = 1 - distanceFromShimmer / maxDistance
      shimmerIntensity = proximityFactor * 0.8 // Higher intensity when closer
    } else if (
      globalShimmerY >= node_y + node_height &&
      globalShimmerY < node_y + node_height + shimmerWidth
    ) {
      // Shimmer is exiting to bottom - intensity higher when closer to global shimmer Y
      const distanceFromShimmer = Math.abs(globalShimmerY - (node_y + node_height))
      const maxDistance = shimmerWidth
      const proximityFactor = 1 - distanceFromShimmer / maxDistance
      shimmerIntensity = proximityFactor * 0.8 // Higher intensity when closer
    }

    // Draw the node with shimmered color based on intensity
    ctx.fillStyle = createShimmeredColor(shimmerIntensity)
    ctx.fillRect(node_x, node_y, node_width, node_height)

    // Draw black stroke around the rectangle
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 1
    ctx.strokeRect(node_x, node_y, node_width, node_height)
  }
}

function createShimmeredColor(intensity: number): string {
  // base color (color when intensity is 0)
  const baseColor = { r: 170, g: 170, b: 170 } // #aaaaaa

  // target color (target color when intensity is 1)
  const targetColor = { r: 117, g: 154, b: 184 } // #759ab8, aka. slurm-web-blue

  // Interpolate between baseColor and targetColor based on intensity
  const r = Math.round(baseColor.r + (targetColor.r - baseColor.r) * intensity)
  const g = Math.round(baseColor.g + (targetColor.g - baseColor.g) * intensity)
  const b = Math.round(baseColor.b + (targetColor.b - baseColor.b) * intensity)

  return `rgb(${r}, ${g}, ${b})`
}

function startShimmerAnimation(): void {
  if (animationId) return // Animation already running

  const animate = (time: number) => {
    // Stop animation when nodes are loaded or canvas is not available
    if (!nodesLoading || !canvas.value) {
      animationId = null
      return
    }

    const ctx = canvas.value.getContext('2d')
    if (ctx && bitmap) {
      // Draw shimmer animation
      drawShimmerAnimation(ctx, time)
    }

    animationId = requestAnimationFrame(animate)
  }

  animationId = requestAnimationFrame(animate)
}

function stopShimmerAnimation(): void {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

function drawNodeCoresMode(
  ctx: CanvasRenderingContext2D,
  nodeName: string,
  node_x: number,
  node_y: number,
  node_width: number,
  node_height: number
): void {
  // Draw cores progress bar
  const coresUsage = getNodeCoresUsage(nodeName)
  drawCoresProgressBar(ctx, node_x, node_y, node_width, node_height, coresUsage)

  // Draw node stroke if its color is defined
  const strokeColor = getNodeStrokeColor(getNodeState(nodeName))
  if (strokeColor) {
    drawNodeStroke(ctx, node_x, node_y, node_width, node_height, strokeColor)
  }

  // Draw text overlay on top of stroke
  drawCoresTextOverlay(ctx, node_x, node_y, node_width, node_height, coresUsage)
}

function drawNodeNodesMode(
  ctx: CanvasRenderingContext2D,
  nodeName: string,
  nodePath: Path2D,
  node_x: number,
  node_y: number,
  node_width: number,
  node_height: number
): void {
  const states = getNodeState(nodeName)
  // Draw nodes with state-based colors
  const fillColor = getNodeFillColor(states)
  ctx.fillStyle = fillColor
  ctx.fill(nodePath)

  // Draw node stroke if its color is defined
  const strokeColor = getNodeStrokeColor(states)
  if (strokeColor) {
    drawNodeStroke(ctx, node_x, node_y, node_width, node_height, strokeColor)
  }
}

async function updateCanvas(fullUpdate: boolean = true) {
  if (container.value !== null && canvas.value !== null) {
    if (fullUpdate) {
      racksLoading.value = true
      /* Resize canvas to fill parent container size */
      canvas.value.width = container.value.clientWidth
      canvas.value.height = container.value.clientHeight
      try {
        ;[image, coordinates] = await gateway.infrastructureImagePng(
          cluster,
          runtimeStore.getCluster(cluster).infrastructure,
          canvas.value.width,
          canvas.value.height
        )
      } catch (error) {
        if (error instanceof APIServerError) {
          reportAPIServerError(error)
        } else if (error instanceof Error) {
          reportOtherError(error)
        }
        return
      }
      bitmap = await createImageBitmap(image)
      /* Calculate x and y shift required to center generated image */
      x_shift = Math.round((canvas.value.width - bitmap.width) / 2)
      y_shift = Math.round((canvas.value.height - bitmap.height) / 2)
      emit('imageSize', x_shift, bitmap.width)
      racksLoading.value = false
      // Start shimmer animation only if nodes are loading
      if (nodesLoading) {
        startShimmerAnimation()
      }
    }

    const ctx = canvas.value.getContext('2d')
    if (ctx && image && coordinates && bitmap) {
      if (fullUpdate) {
        ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
        ctx.drawImage(bitmap, x_shift, y_shift, bitmap.width, bitmap.height)
      }

      // Draw all nodes using their coordinates
      for (const [nodeName, nodeCoordinates] of Object.entries(coordinates)) {
        const nodePath = new Path2D()
        const node_x = nodeCoordinates[0] + x_shift + 0.5
        const node_y = nodeCoordinates[1] + y_shift - 0.5
        nodePath.rect(node_x, node_y, nodeCoordinates[2] - 1, nodeCoordinates[3])

        if (!inSelectedNodes(nodeName)) {
          ctx.fillStyle = '#aaaaaa'
          ctx.fill(nodePath)
        } else {
          if (mode === 'cores') {
            drawNodeCoresMode(ctx, nodeName, node_x, node_y, nodeCoordinates[2], nodeCoordinates[3])
          } else {
            drawNodeNodesMode(
              ctx,
              nodeName,
              nodePath,
              node_x,
              node_y,
              nodeCoordinates[2],
              nodeCoordinates[3]
            )
          }

          // Add node path to global hash
          allNodesPaths[nodeName] = {
            x: node_x,
            y: node_y,
            width: nodeCoordinates[2],
            height: nodeCoordinates[3],
            path: nodePath
          }
        }
        // Draw general black stroke to delimit all nodes
        ctx.strokeStyle = 'black'
        ctx.stroke(nodePath)
      }
      // redraw hover ring if cursor is currently over a node
      if (currentNode.value) {
        drawNodeHoverRing(ctx, allNodesPaths[currentNode.value.name].path)
      }
    }
  }
}

function setMouseEventHandler() {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  canvas.value.addEventListener('mousemove', (event) => {
    let nodeFound = false
    // Iterate over all nodes
    for (const [nodeName, nodePath] of Object.entries(allNodesPaths)) {
      const isPointInPath = ctx.isPointInPath(nodePath.path, event.offsetX, event.offsetY)
      if (isPointInPath) {
        nodeFound = true
        nodeTooltipOpen.value = true
        currentNode.value = getClusterNode(nodeName)
        // Check mouse moved over another node
        if (nodePath.path !== previousPath) {
          // Erase hover ring on previous node
          if (previousPath) {
            ctx.strokeStyle = 'black'
            ctx.stroke(previousPath)
          }
          // Position nodeTooltip
          if (nodeTooltip.value && container.value) {
            // The tooltip has a width of w-40, ie. 160px. Shift its left side
            // to center it on the node, and right-shift it by 1px.
            nodeTooltip.value.style.left =
              (nodePath.x + (nodePath.width - 160) / 2 - 1).toString() + 'px'
            nodeTooltip.value.style.bottom =
              (container.value.offsetHeight - nodePath.y + 10).toString() + 'px'
          }
          drawNodeHoverRing(ctx, nodePath.path)
          previousPath = nodePath.path
        }
        if (canvas.value) {
          canvas.value.style.cursor = 'pointer'
        }
      }
    }

    if (!nodeFound) {
      if (previousPath && currentNode.value) {
        ctx.strokeStyle = 'black'
        ctx.stroke(previousPath)
      }
      previousPath = undefined
      nodeTooltipOpen.value = false
      currentNode.value = undefined
      if (canvas.value) {
        canvas.value.style.cursor = 'default'
      }
    }
  })
  canvas.value.addEventListener('mouseup', (event) => {
    // Iterate over all nodes
    for (const [nodeName, nodePath] of Object.entries(allNodesPaths)) {
      const isPointInPath = ctx.isPointInPath(nodePath.path, event.offsetX, event.offsetY)
      if (isPointInPath) {
        router.push({
          name: 'node',
          params: { cluster: cluster, nodeName: nodeName },
          query: { returnTo: route.name as string }
        })
      }
    }
  })
}

// window.resize event listener
function updateCanvasDimensions() {
  if (canvas.value !== null) {
    racksLoading.value = true
    currentNode.value = undefined
    previousPath = undefined
    /*
     * Temporary minimize canvas size to let the container set its own size without
     * constraint.
     */
    canvas.value.width = canvas.value.height = 0
    // clear the timeout
    clearTimeout(timeout)
    // start timing for event "completion"
    timeout = window.setTimeout(updateCanvas, delay)
  }
}

/*
 * If cluster changes, reset everything and fully redraw canvas.
 */
watch(
  () => cluster,
  async () => {
    unable.value = false
    currentNode.value = undefined
    previousPath = undefined
    allNodesPaths = {}
    // Wait for canvas element to be rendered in DOM.
    await nextTick()
    updateCanvas()
  }
)

/*
 * If nodes states change, update the canvas but not fully (ie. re-download
 * image/coordinates).
 */
watch(
  () => nodes,
  () => {
    allNodesPaths = {}
    updateCanvas(false)
  }
)

onMounted(() => {
  updateCanvas()
  setMouseEventHandler()
  window.addEventListener('resize', updateCanvasDimensions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasDimensions)
  stopShimmerAnimation()
})
</script>

<template>
  <div
    ref="container"
    :class="[
      fullscreen ? 'grow' : unable ? 'h-8' : 'h-96',
      'flex min-w-full items-center justify-center'
    ]"
  >
    <span v-if="unable" class="text-sm text-gray-500">{{ errorMessage }}</span>
    <template v-else>
      <div v-show="racksLoading" class="text-slurmweb h-1/2">
        <LoadingSpinner :size="8" />
      </div>

      <aside ref="nodeTooltip" :class="[nodeTooltipOpen ? '' : 'hidden', 'absolute']">
        <div
          v-if="currentNode"
          class="w-40 overflow-hidden rounded-md bg-white shadow-lg dark:bg-gray-800"
        >
          <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
            <li class="bg-gray-200 py-2 text-center text-sm dark:bg-gray-700 dark:text-gray-100">
              <strong>Node {{ currentNode.name }}</strong>
            </li>
            <li class="flex px-4 py-1 text-xs text-gray-400 dark:text-gray-200">
              <NodeMainState :status="currentNode.state" />
            </li>
            <li class="flex justify-between px-4 py-1 text-xs text-gray-400 dark:text-gray-200">
              <NodeAllocationState :status="currentNode.state" />
              <span
                v-if="mode === 'cores'"
                class="text-right text-xs text-gray-400 dark:text-gray-200"
              >
                {{ currentNode.alloc_cpus }}/{{ currentNode.cpus }}
              </span>
            </li>
          </ul>
        </div>
        <div
          class="absolute right-0 left-0 m-auto h-0 w-0 border-x-[12px] border-t-[10px] border-x-transparent border-t-white dark:border-t-gray-800"
        ></div>
      </aside>

      <canvas v-show="!racksLoading" ref="canvas">Cluster canvas</canvas>
    </template>
  </div>
</template>
