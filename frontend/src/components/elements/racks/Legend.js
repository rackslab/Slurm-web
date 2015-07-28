import React, { PropTypes } from 'react'
import Radium from 'radium'
// import * as config from './config'
import * as draw from './draw'


@Radium
export default class Legend extends React.Component {

  static propTypes = {
    isJobsMap: PropTypes.bool.isRequired
  }

  componentDidMount () {
    draw.drawLegend(this.props.isJobsMap)
  }

  render () {
    const styles = {
      position: 'absolute',
      top: '55px',
      right: '180px'
    }

    return (
      <canvas
        id='cv_rackmap_legend'
        style={styles}
      />
    )
  }
}
