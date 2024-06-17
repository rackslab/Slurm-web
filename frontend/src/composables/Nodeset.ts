/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

class ConsecutiveNodes {
  pattern: string
  ids: string[]
  firstNodeId: number
  lastNodeId: number

  constructor(pattern: string, ids: string[]) {
    this.pattern = pattern
    this.ids = ids
    this.firstNodeId = this.lastNodeId = parseInt(ids[ids.length - 1])
  }
  isNext(pattern: string, ids: string[]): boolean {
    // different pattern
    if (pattern != this.pattern) return false
    // different number of ids
    if (ids.length != this.ids.length) return false
    for (const [i, id] of ids.entries()) {
      // test if not last id
      if (i < ids.length - 1) {
        // all ids except the last must be equal
        if (id != this.ids[i]) {
          return false
        }
      } else {
        // last id must be the same length
        if (id.length != this.ids[i].length) return false
        // last id must must be last node id + 1
        if (parseInt(id) != this.lastNodeId + 1) return false
      }
    }
    return true
  }
  addOne(): void {
    this.lastNodeId += 1
  }
  render(): string {
    let result = this.pattern

    // replace all %s by all except last id
    for (const [i, id] of this.ids.entries()) {
      if (i < this.ids.length - 1) result = result.replace('%s', id)
    }

    if (this.firstNodeId == this.lastNodeId) {
      // if only one node, just replace last %s by the last id
      return result.replace('%s', this.ids[this.ids.length - 1])
    } else {
      // if multiple nodes, replace last %s by the range with correct padding
      const range =
        '[' +
        this.firstNodeId.toString().padStart(this.ids[this.ids.length - 1].length, '0') +
        '-' +
        this.lastNodeId.toString().padStart(this.ids[this.ids.length - 1].length, '0') +
        ']'
      return result.replace('%s', range)
    }
  }
}

export function foldNodeset(nodeNames: string[]): string {
  const re = /(?<prefix>\D*)(?<id>\d*)/g

  let currentConsecutiveNodes: ConsecutiveNodes | undefined = undefined
  const allConsecutiveNodes: ConsecutiveNodes[] = []

  nodeNames.sort().forEach((nodeName) => {
    let all = [...nodeName.matchAll(re)]
    let node_pattern = String()
    let node_ids = Array()
    all.forEach((match) => {
      if (match[1].length) {
        node_pattern += match[1]
      }
      if (match[2].length) {
        node_pattern += '%s'
        node_ids.push(match[2])
      }
    })
    console.log(`pattern: ${node_pattern} ids: ${node_ids}`)

    if (currentConsecutiveNodes && currentConsecutiveNodes.isNext(node_pattern, node_ids)) {
      currentConsecutiveNodes.addOne()
    } else {
      currentConsecutiveNodes = new ConsecutiveNodes(node_pattern, node_ids)
      allConsecutiveNodes.push(currentConsecutiveNodes)
    }
  })

  return allConsecutiveNodes.map((consecutiveNodes) => consecutiveNodes.render()).join()
}

export function expandNodeset(nodeset: string): string[] {
  const re = /([A-Za-z0-9_-]+)(?:([0-9]+)|\[([0-9]+)-([0-9]+)\])/gm
  const result: string[] = []
  for (const match of nodeset.matchAll(re)) {
    const prefix = match[1]
    if (match[2]) {
      result.push(prefix + match[2])
    } else {
      const digits = match[3].length
      const first = parseInt(match[3])
      const last = parseInt(match[4])
      for (let index = first; index <= last; index++) {
        result.push(prefix + index.toString().padStart(digits, '0'))
      }
    }
  }
  return result
}
