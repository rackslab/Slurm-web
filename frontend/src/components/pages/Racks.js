import React, { PropTypes } from 'react'
import Radium from 'radium'
// import RestAPIJobs from '../restAPI/Jobs'
import { fetchOnUpdate } from '../../decorators'
import Rack from '../elements/racks/Rack'
import Legend from '../elements/racks/Legend'
import * as config from '../elements/racks/config'


const styles = {
  base: {
    padding: '20px 40px'
  },
  jobs: {}
}


@fetchOnUpdate([], (params, actions) => {
  actions.fetchRacks()
  actions.fetchNodes()
})
@Radium
export default class Racks extends React.Component {

  constructor (props, context) {
    super(props, context)
  }

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
    actions: PropTypes.object.isRequired,
    restAPI: PropTypes.object
  }

  loadRacks (racks, slurmnodes) {

    if (!config.multiCanvas)
      console.log('Rack drawing not well implemented for multiCanvas "false"')

    let datas = []
    for (let key in racks) {
      datas.push(Object.assign({ 'id': key }, racks[key]))
    }

    return datas.map( (rack) => {
      return (
        <Rack
          rack={rack}
          slurmnodes={slurmnodes}
        />
      )
    })
  }

  render () {
    const { restAPI: { racks, nodes } } = this.props

    let rackmap

    if (Object.keys(racks).length && Object.keys(nodes).length)
      rackmap = this.loadRacks(racks, nodes)

    return (
      <div id='racks' className='main' style={[ styles.base, styles.jobs ]}>
        <h1 className='page-header'>Racks</h1>
        <div id='rackmap' className='pane'>
          <Legend isJobsMap={false} />
          {rackmap}
        </div>
      </div>
    )
  }
}
