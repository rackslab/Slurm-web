import React, { PropTypes } from 'react'
import Radium from 'radium'
import { fetchOnUpdate } from '../../decorators'
import Rack from '../elements/racks/Rack'
import Legend from '../elements/racks/Legend'
import authenticatedComponent from '../../decorators/AuthenticatedComponent'

const styles = {
  base: {
    padding: '20px 40px'
  }
}

@authenticatedComponent
@fetchOnUpdate([], (params, actions, props) => {
  actions.fetchRacks(props)
  actions.fetchNodes(props)
})
@Radium
export default class Racks extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
    actions: PropTypes.object.isRequired,
    restAPI: PropTypes.object
  }

  loadRacks (racks, slurmnodes) {

    let datas = []
    for (let key in racks) {
      datas.push(Object.assign({ 'id': key }, racks[key]))
    }

    return datas.map( (rack) => {
      return (
        <Rack
          rack={rack}
          slurmnodes={slurmnodes} />
      )
    })
  }

  render () {
    const { restAPI: { racks, nodes } } = this.props

    let rackmap

    if (Object.keys(racks).length && Object.keys(nodes).length)
      rackmap = this.loadRacks(racks, nodes)

    return (
      <div id='racks' className='main' style={[styles.base]}>
        <h1 className='page-header'>Racks</h1>
        <div id='rackmap' className='pane'>
          <Legend isJobsMap={false} />
          {rackmap}
        </div>
      </div>
    )
  }
}
