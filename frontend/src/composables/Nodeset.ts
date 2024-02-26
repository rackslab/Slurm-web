class ConsecutiveNodes {
  prefix: string
  digits: number
  firstNodeId: number
  lastNodeId: number

  constructor(prefix: string, digits: number, firstNodeId: number) {
    this.prefix = prefix
    this.digits = digits
    this.firstNodeId = this.lastNodeId = firstNodeId
  }
  isNext(prefix: string, id: number): boolean {
    return prefix == this.prefix && id == this.lastNodeId + 1
  }
  addOne(): void {
    this.lastNodeId += 1
  }
  render(): string {
    if (this.firstNodeId == this.lastNodeId) {
      return this.prefix + this.firstNodeId.toString().padStart(this.digits, '0')
    } else {
      return (
        this.prefix +
        '[' +
        this.firstNodeId.toString().padStart(this.digits, '0') +
        '-' +
        this.lastNodeId.toString().padStart(this.digits, '0') +
        ']'
      )
    }
  }
}

export function foldNodeset(nodeNames: string[]): string {
  const re = /(?<prefix>[A-Za-z_-]+)(?<id>[0-9]+)/
  let currentConsecutiveNodes: ConsecutiveNodes | undefined = undefined
  const allConsecutiveNodes: ConsecutiveNodes[] = []
  nodeNames.sort().forEach((nodeName) => {
    const match = nodeName.match(re)
    if (match && match.groups) {
      if (
        currentConsecutiveNodes &&
        currentConsecutiveNodes.isNext(match.groups.prefix, parseInt(match.groups.id))
      ) {
        currentConsecutiveNodes.addOne()
      } else {
        currentConsecutiveNodes = new ConsecutiveNodes(
          match.groups.prefix,
          match.groups.id.length,
          parseInt(match.groups.id)
        )
        allConsecutiveNodes.push(currentConsecutiveNodes)
      }
    } else {
      console.error(`Unable to match nodename ${nodeName}`)
    }
  })

  return allConsecutiveNodes.map((consecutiveNodes) => consecutiveNodes.render()).join()
}

export function expandNodeset(nodeset: string): string[] {
  //const re = /[A-Za-z_-]+([0-9]+|\[0-9]+\-[0-9]+\])(,[A-Za-z_-]+([0-9]+|\[0-9]+\-[0-9]+\]))*/
  //const re = /[A-Za-z_-]+\[[0-9]+\-[0-9]+\]/
  const re = /([A-Za-z_-]+)(?:([0-9]+)|\[([0-9]+)\-([0-9]+)\])/gm
  const result: string[] = []
  //const re = /([A-Za-z]+(?:[0-9]+|\[[0-9]+\-[0-9]+\]))(?:,([A-Za-z]+(?:[0-9]+|\[[0-9]+\-[0-9]+\])))*/
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
