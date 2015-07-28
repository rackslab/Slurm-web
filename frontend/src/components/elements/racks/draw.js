import * as config from './config'
import * as colors from './colors'

function getRackAbsCoord () {
  let rackCoordX = 0
  let rackCoordY = 0

  let rackAbsX = config.leftMargin +
    (rackCoordX * (config.rackWidth + config.rackHorzMargin))
  let rackAbsY = config.topMargin +
    (rackCoordY * (config.rackHeight + config.rackVertMargin))

  return [ rackAbsX, rackAbsY ]
}


function getCoreAbsCoords (nodeWidth, nodeHeight, nodeAbsX, nodeAbsY,
    coreId, coresRows, coresCols, coreSize) {
  let coreX = Math.floor(coreId / coresRows)
  let coreY = Math.floor(coreId % coresRows)

  //console.log("nodeAbsX: " + nodeAbsX + " nodeWidth: " + nodeWidth +
  // " coresRows: " + coresRows + " coreSize: " + coreSize)
  let coreXOrig = (nodeAbsX + nodeWidth) - (coresCols * coreSize) - 2
  let coreYOrig = nodeAbsY +
    Math.round((nodeHeight - (coresRows * coreSize)) / 2)
  let coreAbsX = coreXOrig + (coreX * coreSize)
  let coreAbsY = coreYOrig + (coreY * coreSize)
  return [ coreAbsX, coreAbsY ]
}


function getNodeColors (slurmnode) {

  let stateColor = colors.colorIdle
  let nodeColor = colors.colorUnknown
  let fullyAllocated

  if (slurmnode === null)
    return [ nodeColor, null ]

  /* node state */
  switch(slurmnode.node_state) {
    case 'IDLE':
    case 'IDLE*':
      stateColor = colors.colorAvailable
      nodeColor = colors.colorIdle
      break
    case 'ALLOCATED':
    case 'ALLOCATED*':
    case 'COMPLETING':
    case 'COMPLETING*':

      /*
       * Check whether the node is fully allocated of not (aka. mix state).
       * For this check, we compare total_cpus (which decreases down to -cpus)
       * as long as cores are allocated on the node. When total_cpus is equal
       * to -cpus, the node can be considered as fully allocated.
       */
      fullyAllocated = slurmnode.total_cpus === -slurmnode.cpus
      stateColor = colors.colorAvailable
      if (fullyAllocated)
        nodeColor = colors.colorFullyAllocated
      else
        nodeColor = colors.colorPartAllocated

      break
    case 'RESERVED':
      fullyAllocated = slurmnode.total_cpus === -slurmnode.cpus
      stateColor = colors.colorReserved
      if (fullyAllocated)
        nodeColor = colors.colorFullyAllocated
      else
        nodeColor = colors.colorPartAllocated

      break
    case 'DRAINING':
    case 'DRAINING*':
    case 'DRAINED':
    case 'DRAINED*':
      stateColor = colors.colorDrained
      nodeColor = colors.colorUnavailable
      break
    case 'DOWN':
    case 'DOWN*':
      stateColor = colors.colorDown
      nodeColor = colors.colorUnavailable
      break
    default:
      console.log('node: ' + slurmnode.name +
        ' -> state: ' + slurmnode.node_state)
      stateColor = 'black'
      nodeColor = colors.colorUnknown
  }

  return [ nodeColor, stateColor ]
}

function writeNodeName (ctx, nodename, nodeAbsX, nodeAbsY, height,
  width, nodeCoordX) {
  /* add node name */
  ctx.fillStyle = 'black'
  if (nodeCoordX === 0)
    ctx.fillText(nodename, nodeAbsX - 55, nodeAbsY + height - 3)
  else
    ctx.fillText(nodename, nodeAbsX + width + config.rackBorderWidth + 3,
      nodeAbsY + height - 3)
}

function drawLed (ctx, x, y, color) {
  ctx.beginPath()
  ctx.arc(x, y, 2, 0, 2 * Math.PI, false)
  ctx.fillStyle = color
  ctx.fill()
}

export function drawNode (rack, racknode, slurmnode) {
  let canvasId = config.canvasIdBase + rack.name
  let ctx = document.getElementById(canvasId).getContext('2d')

  /* relative coordinate of node inside the rack */
  // unit is the number of U, starting from the bottom of the rack
  let nodeCoordX = racknode.posx
  let nodeCoordY = racknode.posy

  let rackAbs = getRackAbsCoord()
  let rackAbsX = rackAbs[0]
  let rackAbsY = rackAbs[1]

  let nodeAbsX = rackAbsX + config.rackBorderWidth +
    (nodeCoordX * config.rackInsideWidth)
  let nodeAbsY = rackAbsY + config.rackHeight -
    config.rackBorderWidth - (nodeCoordY * config.rackUHeight)

  config.nodeWidth =
    racknode.width * config.rackInsideWidth - config.nodeMargin
  config.nodeHeight =
    racknode.height * config.rackUHeight - config.nodeMargin

  //console.log('node_id: ' + id_node + ' -> ' + node_rack + '/' +
  //id_node_in_rack + ' -> coord:' + nodeCoordX + '/' + nodeCoordY +
  //' abs: ' + nodeAbsX + '/' + nodeAbsY)

  let nodeColors = getNodeColors(slurmnode)
  let nodeColor = nodeColors[0]
  let stateColor = nodeColors[1]

  /* node rectangle */
  drawRect(
    ctx,
    nodeAbsX,
    nodeAbsY,
    config.nodeWidth,
    config.nodeHeight,
    nodeColor
  )

  /* draw status LED */
  if (stateColor)
    drawLed(ctx, nodeAbsX + 4, nodeAbsY + 4, stateColor)

  /* write node name */
  writeNodeName(
    ctx,
    racknode.name,
    nodeAbsX,
    nodeAbsY,
    config.nodeHeight,
    config.nodeWidth,
    nodeCoordX
  )
}

function drawNodeCores (rack, racknode, slurmnode, allocatedCpus) {

  let canvasId = config.canvasIdBase + rack.name
  let ctx = document.getElementById(canvasId).getContext('2d')

  /* relative coordinate of node inside the rack */
  // unit is the number of U, starting from the bottom of the rack
  let nodeCoordX = racknode.posx
  let nodeCoordY = racknode.posy

  let rackAbs = getRackAbsCoord(rack)
  let rackAbsX = rackAbs[0]
  let rackAbsY = rackAbs[1]

  let nodeAbsX = rackAbsX + config.rackBorderWidth +
    (nodeCoordX * config.rackInsideWidth)
  let nodeAbsY = rackAbsY + config.rackHeight - config.rackBorderWidth -
    (nodeCoordY * config.rackUHeight)

  config.nodeWidth = racknode.width * config.rackInsideWidth -
    config.nodeMargin
  config.nodeHeight = racknode.height * config.rackUHeight -
    config.nodeMargin

  let nodeColors = getNodeColors(slurmnode)
  let stateColor = nodeColors[1]

  //console.log("node_id: " + id_node + " -> " + node_rack + "/" +
  // id_node_in_rack + " -> coord:" + nodeCoordX + "/" + nodeCoordY +
  // " abs: " + nodeAbsX + "/" + nodeAbsY);

  /* node rectangle */
  drawRect(
    ctx,
    nodeAbsX,
    nodeAbsY,
    config.nodeWidth,
    config.nodeHeight,
    colors.colorIdle
  )

  /* draw status LED */
  if (stateColor)
    drawLed(ctx, nodeAbsX + 4, nodeAbsY + 4, stateColor)

  let coresNb = slurmnode ? slurmnode.cpus : 0
  let coresFactor = bestFactor(config.nodeWidth, config.nodeHeight, coresNb)
  let coresCols = coresFactor[1]
  let coresRows = coresFactor[0]

  //console.log("best factor for node %s: cols %d, rows: %d", slurmnode.name,
  // coresCols, coresRows)

  let coreAbsX = 0
  let coreAbsY = 0

  let coreHeight = Math.round((config.nodeHeight - 4) / coresRows)
  let coreWidth = Math.round((config.nodeWidth - 20) / coresCols)
  let coreSize = Math.min(coreHeight, coreWidth)

  let coreId = 0
  let nbCoresJob = 0
  let coresDrawn = 0
  let coreCoords = null
  let coreColor = null

  /* draw allocated core */
  for (let job in allocatedCpus) {
    if (allocatedCpus.hasOwnProperty(job)) {
      nbCoresJob = allocatedCpus[job]
      coreColor = pickJobColor(parseInt(job))
      for (; coreId < coresDrawn + nbCoresJob; coreId++) {
        coreCoords = getCoreAbsCoords(
          config.nodeWidth,
          config.nodeHeight,
          nodeAbsX,
          nodeAbsY,
          coreId,
          coresRows,
          coresCols,
          coreSize
        )
        coreAbsX = coreCoords[0]
        coreAbsY = coreCoords[1]
        //console.log("coreAbsX: " + coreAbsX + " coreAbsY: " + coreAbsY)
        drawRectBdr(
          ctx,
          coreAbsX,
          coreAbsY,
          coreSize,
          coreSize,
          1,
          coreColor,
          colors.colorCoreBorder
        )
      }
      coresDrawn += nbCoresJob
    }
  }

  /* draw idle cores */
  for (; coreId < coresNb; coreId++) {
    //console.log("node %s: core %d: x: %f, y: %f, abs_x: %f, abs_y: %f",
    // slurmnode.name, coreId, coreX, coreY, coreAbsX, coreAbsY)
    coreCoords = getCoreAbsCoords(
      config.nodeWidth,
      config.nodeHeight,
      nodeAbsX,
      nodeAbsY,
      coreId,
      coresRows,
      coresCols,
      coreSize
    )
    coreAbsX = coreCoords[0]
    coreAbsY = coreCoords[1]
    drawRectBdr(
      ctx,
      coreAbsX,
      coreAbsY,
      coreSize,
      coreSize,
      1,
      colors.colorIdle,
      colors.colorCoreBorder
    )
  }

  /* write node name */
  writeNodeName(
    ctx,
    racknode.name,
    nodeAbsX,
    nodeAbsY,
    config.nodeHeight,
    config.nodeWidth
  )
}


function factors (num) {

  let nFactors = []

  for (let i = 1; i <= Math.floor(Math.sqrt(num)); i += 1)
    if (num % i === 0)
      nFactors.push([ i, num / i ])

  nFactors.sort( (a, b) => { return a[0] - b[0] } )  // numeric sort
  return nFactors
}


function bestFactor (nodeWidth, nodeHeight, nbCores) {

  if (nbCores === 0)
      return [ null, null ]

  let allFactors = factors(nbCores)
  let goalRatio = (nodeWidth - 20) / (nodeHeight - 4)
  let ratio = -1
  let bestRatio = -1
  let bestFactorId = 0

  for (let i = 0; i < allFactors.length; i++) {
    ratio = allFactors[i][1] / allFactors[i][0]
    //console.log("%d/%d: ratio: %f bestRatio: %f", allFactors[i][1],
    // allFactors[i][0], ratio, bestRatio);
    if (Math.abs(ratio - goalRatio) < Math.abs(bestRatio - goalRatio)) {
      bestRatio = ratio
      bestFactorId = i
    }
  }

  return allFactors[bestFactorId]
}


function drawRect (ctx, x, y, width, height, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, width, height)
}

export function drawRectBdr (ctx, x, y, width, height, borderWidth,
  colorFill, colorBorder) {
  ctx.beginPath()
  // start at .5 to avoid border blurred on 2 sub-pixels
  ctx.rect(x - 0.5, y - 0.5, width, height)
  ctx.fillStyle = colorFill
  ctx.fill()
  ctx.lineWidth = borderWidth
  ctx.strokeStyle = colorBorder
  ctx.stroke()
  //console.log('drawRectBdr: x:' + x + ' y:' + y + ' width: ' + width +
  // ' height:' + height + ' border:' + borderWidth)
}

export function drawRack (rack, slurmnodes, allocatedCpus) {

  let canvasId = config.canvasIdBase + rack['name']
  let canvas = document.getElementById(canvasId)

  // set canvas dimensions here because you cannot get them
  // from HTML element before its rendering
  canvas.width = config.canvasWidth
  canvas.height = config.canvasHeight

  let ctx = canvas.getContext('2d')
  let rackAbs = getRackAbsCoord(rack)
  let rackAbsX = rackAbs[0]
  let rackAbsY = rackAbs[1]

  // global rect for whole rack (except floor and feet)
  drawRect(
    ctx,
    rackAbsX,
    rackAbsY,
    config.rackWidth,
    config.rackHeight,
    'rgba(89,89,89,1)'
  )
  // rack borders
  drawRectBdr(
    ctx,
    rackAbsX,
    rackAbsY,
    config.rackBorderWidth,
    config.rackHeight,
    1,
    'rgba(141,141,141,1)',
    'rgba(85,85,85,1)'
  )
  drawRectBdr(
    ctx,
    rackAbsX + config.rackWidth - config.rackBorderWidth,
    rackAbsY,
    config.rackBorderWidth,
    config.rackHeight,
    1,
    'rgba(141,141,141,1)',
    'rgba(85,85,85,1)'
  )
  drawRectBdr(
    ctx,
    rackAbsX + config.rackBorderWidth,
    rackAbsY,
    config.rackWidth - (2 * config.rackBorderWidth),
    config.rackBorderWidth,
    1,
    'rgba(141,141,141,1)',
    'rgba(85,85,85,1)'
  )
  drawRectBdr(
    ctx,
    rackAbsX + config.rackBorderWidth,
    rackAbsY + config.rackHeight - config.rackBorderWidth,
    config.rackWidth - (2 * config.rackBorderWidth),
    config.rackBorderWidth,
    1,
    'rgba(141,141,141,1)',
    'rgba(85,85,85,1)'
  )
  // rack floor
  drawRectBdr(
    ctx,
    rackAbsX,
    rackAbsY + config.rackHeight,
    config.rackWidth,
    config.floorWidth,
    1,
    'rgba(89,89,89,1)',
    'rgba(39,39,39,1)'
  )
  // rack foots
  drawRectBdr(
    ctx,
    rackAbsX,
    rackAbsY + config.rackHeight + config.floorWidth,
    config.footWidth,
    config.footHeight,
    1,
    'rgba(49,49,49,1)',
    'rgba(39,39,39,1)'
  )
  drawRectBdr(
    ctx,
    rackAbsX + config.rackWidth - config.footWidth,
    rackAbsY + config.rackHeight + config.floorWidth,
    config.footWidth,
    config.footHeight,
    1,
    'rgba(49,49,49,1)',
    'rgba(39,39,39,1)'
  )

  // rack name
  ctx.font = '14px sans-serif'
  ctx.fillText('rack ' + rack.name, rackAbsX + 60, rackAbsY - 3)
  ctx.font = '10px sans-serif' // back to default

  for (let key of Object.keys(rack.nodes))
    if (allocatedCpus)
      drawNodeCores(
        rack,
        rack.nodes[key],
        slurmnodes[rack.nodes[key].name],
        allocatedCpus[rack.nodes[key].name]
      )
    else
      drawNode(
        rack,
        rack.nodes[key],
        slurmnodes[rack.nodes[key].name]
      )
}


function pickJobColor (jobId) {
  let nbColors = colors.jobColors.length
  let color = colors.jobColors[jobId % nbColors]
  //console.log('job color: '+ color)
  return color
}

export function drawLegend (isJobMaps) {
  let canvasId = 'cv_rackmap_legend'
  let canvas = document.getElementById(canvasId)

  // set canvas dimensions here because you cannot get them
  // from HTML element before its rendering
  canvas.width = config.canvasLegendWidth
  canvas.height = config.canvasLegendHeight

  let ctx = canvas.getContext('2d')
  let legendX = 10
  let legendY = 15
  let legendWidth = isJobMaps ? 90 : 98
  let legendHeight = isJobMaps ? 65 : 90

  drawRectBdr(ctx, 1, 1, legendWidth, legendHeight, 1,
    'rgba(255,255,255,1)', 'rgba(200,200,200,1)')

  ctx.fillStyle = 'black'
  ctx.font = '12px sans-serif'
  ctx.fillText('node state:', legendX - 3, legendY)
  ctx.font = '10px sans-serif' // back to default

  legendY += 10
  drawLed(ctx, legendX + 1, legendY, colors.colorAvailable)
  ctx.fillStyle = 'black'
  ctx.fillText('available', legendX + 10, legendY + 3)

  legendY += 10
  drawLed(ctx, legendX + 1, legendY, colors.colorDrained)
  ctx.fillStyle = 'black'
  ctx.fillText('drained', legendX + 10, legendY + 3)

  legendY += 10
  drawLed(ctx, legendX + 1, legendY, colors.colorDown)
  ctx.fillStyle = 'black'
  ctx.fillText('down', legendX + 10, legendY + 3)

  legendY += 10
  drawLed(ctx, legendX + 1, legendY, colors.colorReserved)
  ctx.fillStyle = 'black'
  ctx.fillText('reserved', legendX + 10, legendY + 3)

  if (!isJobMaps) {
    legendY += 10
    drawRect(ctx, legendX - 2, legendY, 9, 9, colors.colorFullyAllocated)
    ctx.fillStyle = 'black'
    ctx.fillText('fully allocated', legendX + 10, legendY + 10)

    legendY += 10
    drawRect(ctx, legendX - 2, legendY, 9, 9, colors.colorPartAllocated)
    ctx.fillStyle = 'black'
    ctx.fillText('partly allocated', legendX + 10, legendY + 10)
  }
}
