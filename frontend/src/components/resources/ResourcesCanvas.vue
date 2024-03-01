<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { Ref, PropType } from 'vue'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import type { ClusterNode, RacksDBInfrastructureCoordinates } from '@/composables/GatewayAPI'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import Spinner from '@/components/Spinner.vue'
import router from '@/router'

const props = defineProps({
  cluster: {
    type: String,
    required: true
  },
  nodes: {
    type: Array as PropType<ClusterNode[]>,
    required: true
  },
  fullscreen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['imageSize'])

const gateway = useGatewayAPI()

const container: Ref<HTMLDivElement | null> = ref(null)
const loading: Ref<HTMLSpanElement | null> = ref(null)
const canvas: Ref<HTMLCanvasElement | null> = ref(null)
const nodeTooltip: Ref<HTMLDivElement | null> = ref(null)
const nodeTooltipOpen: Ref<boolean> = ref(false)
let timeout: number = -1 // holder for timeout id
const delay = 250 // delay after event is "complete" to run callback
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
    return props.nodes.filter((node) => node.name == nodeName)[0]
  } catch (error: any) {
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

function getNodeFillStrokeColors(nodeName: string): [string, string | undefined] {
  const fillColors = {
    DOWN: '#b82c2c',
    IDLE: '#71db78',
    MIXED: '#f2ab78',
    ALLOCATED: '#bf5a13'
  }
  const strokeColors = {
    DOWN: '#b82c2c',
    DRAINING: '#b380c4',
    DRAIN: '#b654d6'
  }
  const states = getNodeState(nodeName)
  let fillColor = '#ffffff'
  let strokeColor = undefined
  for (const [status, color] of Object.entries(fillColors)) {
    if (states.includes(status)) {
      fillColor = color
      break
    }
  }
  for (const [status, color] of Object.entries(strokeColors)) {
    if (states.includes(status)) {
      strokeColor = color
      break
    }
  }
  return [fillColor, strokeColor]
}

function drawNodeHoverRing(ctx: CanvasRenderingContext2D, nodePath: Path2D): void {
  ctx.strokeStyle = '#74a5d6' // hover color
  ctx.stroke(nodePath)
}

async function updateCanvas(fullUpdate: boolean = true) {
  if (container.value !== null && loading.value !== null && canvas.value !== null) {
    if (fullUpdate) {
      /* Resize canvas to fill parent container size */
      canvas.value.width = container.value.clientWidth
      canvas.value.height = container.value.clientHeight
      ;[image, coordinates] = await gateway.infrastructureImagePng(
        props.cluster,
        canvas.value.width,
        canvas.value.height
      )
      bitmap = await createImageBitmap(image)
      /* Calculate x and y shift required to center generated image */
      x_shift = Math.round((canvas.value.width - bitmap.width) / 2)
      y_shift = Math.round((canvas.value.height - bitmap.height) / 2)
      emit('imageSize', x_shift, bitmap.width)
    }

    const ctx = canvas.value.getContext('2d')
    if (ctx && image && coordinates && bitmap) {
      console.log(
        `image width ${bitmap.width} height ${bitmap.height} canvas width ${canvas.value.width} height ${canvas.value.height}`
      )
      if (fullUpdate) {
        ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
        ctx.drawImage(bitmap, x_shift, y_shift, bitmap.width, bitmap.height)
      }
      loading.value.style.display = 'none'
      canvas.value.style.display = 'block'

      // Draw all nodes using their coordinates
      for (const [nodeName, nodeCoordinates] of Object.entries(coordinates)) {
        const nodePath = new Path2D()
        const node_x = nodeCoordinates[0] + x_shift + 1
        const node_y = nodeCoordinates[1] + y_shift
        nodePath.rect(node_x, node_y, nodeCoordinates[2] - 1, nodeCoordinates[3])

        if (!inSelectedNodes(nodeName)) {
          ctx.fillStyle = '#aaaaaa'
          ctx.fill(nodePath)
        } else {
          const [fillColor, strokeColor] = getNodeFillStrokeColors(nodeName)
          ctx.fillStyle = fillColor
          ctx.fill(nodePath)

          // Draw node stroke if its color is defined
          if (strokeColor) {
            ctx.strokeStyle = strokeColor
            // Define stroke width depending on node height
            if (nodeCoordinates[3] > 10) {
              ctx.lineWidth = 5
            } else {
              ctx.lineWidth = 2
            }
            ctx.strokeRect(
              nodeCoordinates[0] + x_shift + ctx.lineWidth / 2 + 1,
              nodeCoordinates[1] + y_shift + ctx.lineWidth / 2,
              nodeCoordinates[2] - ctx.lineWidth - 1,
              nodeCoordinates[3] - ctx.lineWidth
            )
            ctx.lineWidth = 1
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
            //console.log(nodePath.x.toString(), nodePath.y.toString())
            nodeTooltip.value.style.left =
              (nodePath.x + (nodePath.width - 176) / 2).toString() + 'px'
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
    let nodeFound = false
    // Iterate over all nodes
    for (const [nodeName, nodePath] of Object.entries(allNodesPaths)) {
      const isPointInPath = ctx.isPointInPath(nodePath.path, event.offsetX, event.offsetY)
      if (isPointInPath) {
        router.push({ name: 'node', params: { cluster: props.cluster, nodeName: nodeName } })
      }
    }
  })
}

// window.resize event listener
function updateCanvasDimensions() {
  if (loading.value !== null && canvas.value !== null) {
    loading.value.style.display = 'block'
    canvas.value.style.display = 'none'
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
    timeout = setTimeout(updateCanvas, delay)
  }
}

/*
 * If cluster changes, reset everything and fully redraw canvas.
 */
watch(
  () => props.cluster,
  () => {
    currentNode.value = undefined
    previousPath = undefined
    allNodesPaths = {}
    updateCanvas()
  }
)

/*
 * If nodes states change, update the canvas but not fully (ie. re-download
 * image/coordinates).
 */
watch(
  () => props.nodes,
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
})
</script>

<template>
  <div
    ref="container"
    :class="[fullscreen ? 'grow' : 'h-96', 'flex min-w-full items-center justify-center']"
  >
    <div ref="loading" class="h-1/2 text-slurmweb">
      <Spinner :size="8" />
    </div>

    <aside ref="nodeTooltip" :class="[nodeTooltipOpen ? '' : 'hidden', 'absolute']">
      <div v-if="currentNode" class="w-40 overflow-hidden rounded-md bg-white shadow-lg">
        <ul role="list" class="divide-y divide-gray-200">
          <li class="bg-gray-200 py-2 text-center text-sm">
            <strong>Node {{ currentNode.name }}</strong>
          </li>
          <li class="flex px-4 py-1 text-xs text-gray-400">
            <NodeMainState :node="currentNode" />
          </li>
          <li class="flex px-4 py-1 text-xs text-gray-400">
            <NodeAllocationState :node="currentNode" />
          </li>
        </ul>
      </div>
      <div
        class="absolute left-0 right-0 m-auto h-0 w-0 border-x-[12px] border-t-[10px] border-x-transparent border-t-white"
      ></div>
    </aside>

    <canvas ref="canvas">Cluster canvas</canvas>
  </div>
</template>
