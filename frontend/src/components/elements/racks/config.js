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

/*
 * Defines whether racks are drawn in one large canvas or in multiple canvas,
 * one per rack.
 */
export const multiCanvas = true

// TODO: compute based on racks dimensions
// TODO: compute based on racks dimensions + nb racks / racks_per_row
export const canvasWidth = multiCanvas ? 280 : 1480
export const canvasHeight = multiCanvas ? rackHeight + 30 : 950
export const canvasLegendHeight = 100
export const canvasLegendWidth = 100

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
