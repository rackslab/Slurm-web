import React, { PropTypes } from 'react'
import Radium from 'radium'
import * as config from './config'
import * as draw from './draw'


@Radium
export default class Rack extends React.Component {

  static propTypes = {
    rack: PropTypes.object.isRequired,
    slurmnodes: PropTypes.object.isRequired,
    allocatedCpus: PropTypes.object
  }

  componentDidMount () {
    const { rack, slurmnodes, allocatedCpus } = this.props
    draw.drawRack(rack, slurmnodes, allocatedCpus)
  }

  render () {

    return (
      <canvas id={config.canvasIdBase + this.props.rack.id} />
    )
  }
}
