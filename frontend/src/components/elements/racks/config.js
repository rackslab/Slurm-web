/*
 * Config for racks
 */

export const leftMargin = 60
export const topMargin = 15
export const rackHorzMargin = 100
export const rackVertMargin = 30

export const rackNbU = 42
export const rackUHeight = 12
export const rackBorderWidth = 10
export const floorWidth = 5
export const footHeight = 3
export const footWidth = 7
export const rackInsideWidth = 150
export const rackWidth = rackInsideWidth + 2 * rackBorderWidth
export const rackInsideHeight = rackNbU * rackUHeight

// racks floor and feet are ignored
export const rackHeight = rackInsideHeight + 2 * rackBorderWidth

// TODO: compute based on racks dimensions
// TODO: compute based on racks dimensions + nb racks / racks_per_row
export const canvasWidth = 280
export const canvasHeight = rackHeight + 30
export const canvasLegendHeight = 100
export const canvasLegendWidth = 100
export const canvasIdBase = 'cv_rackmap_'

export const nodesPerRack = 72
export const nodesPerRow = 2
export const nodesPerCol = Math.floor(nodesPerRack / nodesPerRow)
export const nodeMargin = 1
export const nodeWidth = Math.floor(
  (rackWidth - (2 * rackBorderWidth) -
    ((nodesPerRow * nodeMargin) + nodeMargin)
  ) / nodesPerRow
)
export const nodeHeight = Math.floor(
  (rackHeight - (2 * rackBorderWidth) -
    ((nodesPerCol * nodeMargin) + nodeMargin)
  ) / nodesPerCol
)
