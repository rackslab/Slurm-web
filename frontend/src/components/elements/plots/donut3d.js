import d3 from 'd3'

let donut3d = {}

function pieTop (d, rx, ry, ir) {

  if (d.endAngle - d.startAngle === 0)
     return 'M 0 0'

  let sx = rx * Math.cos(d.startAngle),
    sy = ry * Math.sin(d.startAngle),
    ex = rx * Math.cos(d.endAngle),
    ey = ry * Math.sin(d.endAngle)

  let ret = []
  ret.push('M', sx, sy, 'A', rx, ry, '0',
    (d.endAngle - d.startAngle > Math.PI ? 1 : 0),
    '1', ex, ey, 'L', ir * ex, ir * ey)
  ret.push('A', ir * rx, ir * ry, '0',
    (d.endAngle - d.startAngle > Math.PI ? 1 : 0),
    '0', ir * sx, ir * sy, 'z')
  return ret.join(' ')
}

function pieOuter (d, rx, ry, h) {
  let startAngle = (d.startAngle > Math.PI ? Math.PI : d.startAngle)
  let endAngle = (d.endAngle > Math.PI ? Math.PI : d.endAngle)

  let sx = rx * Math.cos(startAngle),
    sy = ry * Math.sin(startAngle),
    ex = rx * Math.cos(endAngle),
    ey = ry * Math.sin(endAngle)

    let ret = []
    ret.push('M', sx, h + sy, 'A', rx, ry, '0 0 1', ex, h + ey,
      'L', ex, ey, 'A', rx, ry, '0 0 0', sx, sy, 'z')
    return ret.join(' ')
}

function pieInner (d, rx, ry, h, ir) {
  let startAngle = (d.startAngle < Math.PI ? Math.PI : d.startAngle)
  let endAngle = (d.endAngle < Math.PI ? Math.PI : d.endAngle)

  let sx = ir * rx * Math.cos(startAngle),
    sy = ir * ry * Math.sin(startAngle),
    ex = ir * rx * Math.cos(endAngle),
    ey = ir * ry * Math.sin(endAngle)

    let ret = []
    ret.push('M', sx, sy, 'A', ir * rx, ir * ry, '0 0 1', ex, ey,
      'L', ex, h + ey, 'A', ir * rx, ir * ry, '0 0 0', sx, h + sy, 'z')
    return ret.join(' ')
}

function getLabel (d) {
  // return `${d.data.label} : ${(d.endAngle - d.startAngle > 0.2 ?
  //     Math.round(
  //       1000 * (d.endAngle - d.startAngle) / (Math.PI * 2)
  //     ) / 10 + '%' : '')}`
  return `${d.data.label}`
}

donut3d.transition = function (id, data, rx, ry, h, ir) {
  function arcTweenInner (a) {
    let i = d3.interpolate(this._current, a)
    this._current = i(0)
    return (t) => { return pieInner(i(t), rx + 0.5, ry + 0.5, h, ir) }
  }
  function arcTweenTop (a) {
    let i = d3.interpolate(this._current, a)
    this._current = i(0)
    return (t) => { return pieTop(i(t), rx, ry, ir) }
  }
  function arcTweenOuter (a) {
    let i = d3.interpolate(this._current, a)
    this._current = i(0)
    return (t) => { return pieOuter(i(t), rx - .5, ry - .5, h) }
  }
  function textTweenX (a) {
    let i = d3.interpolate(this._current, a)
    this._current = i(0)
    return (t) => { return (
        0.7 * rx * Math.cos(0.5 * (i(t).startAngle + i(t).endAngle))
      )}
  }
  function textTweenY (a) {
    let i = d3.interpolate(this._current, a)
    this._current = i(0)
    return (t) => { return (
        0.7 * rx * Math.sin(0.5 * (i(t).startAngle + i(t).endAngle))
      )}
  }

  let _data = d3.layout.pie().sort(null).value(
      (d) => { return d.value }
    )(data)

  d3.select('#' + id)
    .selectAll('.innerSlice')
    .data(_data)
    .transition()
    .duration(750)
    .attrTween('d', arcTweenInner)

  d3.select('#' + id)
    .selectAll('.topSlice')
    .data(_data)
    .transition()
    .duration(750)
    .attrTween('d', arcTweenTop)

  d3.select('#' + id)
    .selectAll('.outerSlice')
    .data(_data)
    .transition()
    .duration(750)
    .attrTween('d', arcTweenOuter)

  d3.select('#' + id)
    .selectAll('.label')
    .data(_data)
    .transition()
    .duration(750)
    .attrTween('x', textTweenX)
    .attrTween('y', textTweenY)
    .text(getLabel)
}

donut3d.draw = function (id, data, x/*center x*/, y/*center y*/,
    rx/*radius x*/, ry/*radius y*/, h/*height*/, ir/*inner radius*/) {

  let _data = d3.layout.pie().sort(null).value(
      (d) => { return d.value }
    )(data)

  let slices = d3.select('#' + id).append('g')
    .attr('transform', 'translate(' + x + ',' + y + ')')
    .attr('class', 'slices')

  slices.selectAll('.innerSlice')
    .data(_data)
    .enter()
    .append('path')
    .attr('class', 'innerSlice')
    .style('fill', (d) => { return d3.hsl(d.data.color).darker(0.7) })
    .attr('d', (d) => { return pieInner(d, rx + 0.5, ry + 0.5, h, ir) })
    .each((d) => { this._current = d })

  slices.selectAll('.topSlice')
    .data(_data)
    .enter()
    .append('path')
    .attr('class', 'topSlice')
    .style('fill', (d) => { return d.data.color })
    .style('stroke', (d) => { return d.data.color })
    .attr('d', (d) => { return pieTop(d, rx, ry, ir) })
    .attr('id', (d, i) => { return `${id}-${d.data.label}-${i}-topSlice` })
    .on('mouseover', (d, i) => {
      document
        .getElementById(`${id}-${d.data.label}-${i}-text`)
        .style.display = 'block'
    })
    .on('mouseleave', (d, i) => {
      setTimeout(() => {
        document
          .getElementById(`${id}-${d.data.label}-${i}-text`)
          .style.display = 'none'
      }, 600)
    })
    .each( (d) => { this._current = d })

  slices.selectAll('.outerSlice')
    .data(_data)
    .enter()
    .append('path')
    .attr('class', 'outerSlice')
    .style('fill', (d) => { return d3.hsl(d.data.color).darker(0.7) })
    .attr('d', (d) => { return pieOuter(d, rx - .5, ry - .5, h) })
    .each((d) => { this._current = d })

  slices.selectAll('.label')
    .data(_data)
    .enter()
    .append('text')
    .attr('class', 'label')
    .attr('x', (d) => {
      return 0.7 * rx * Math.cos(0.5 * (d.startAngle + d.endAngle))
    })
    .attr('y', (d) => {
      return 0.7 * ry * Math.sin(0.5 * (d.startAngle + d.endAngle))
    })
    .style('display', 'none')
    .attr('id', (d, i) => { return `${id}-${d.data.label}-${i}-text` })
    .text(getLabel).each((d) => { this._current = d })
}

export default donut3d
