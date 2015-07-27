import React, { PropTypes } from 'react'
import Radium from 'radium'
// import RestAPIJobs from '../restAPI/Jobs'
import { fetchOnUpdate } from '../../decorators'
import Table from '../elements/table/Table'
import Plots from '../elements/plots/Plots'
import { showModalJob, getTimeDiff, maxNodesLen } from '../../utils/utils'


const styles = {
  base: {
    padding: '20px 40px'
  },
  jobs: {}
}

// TableSorter Config
const CONFIG = {
  columns: [
    { id: 'id', name: '#' },
    { id: 'user', name: 'User', format: (data) => {
        return `${data.user_id} (${data.username})`
      }
    },
    { id: 'nodes', name: 'Nodes', format: (data) => {
        if (data.nodes === null)
          return '-'
        else
          // check nodeset length and cut it if too long
          if (data.nodes.length > maxNodesLen)
            return data.nodes.substring(0, maxNodesLen) + '...'
          else
            return data.nodes
      }
    },
    { id: 'job_state', name: 'State' },
    { id: 'state_reason', name: 'Reason', format: (data) => {
        if (data.job_state === 'RUNNING' || data.job_state === 'COMPLETED')
          return '-'
        else
          return data.state_reason
      }
    },
    { id: 'start', name: 'Start', format: (data) => {
        let startTime
        if (data.job_state === 'PENDING' && data.start_time > 0)
          startTime = 'within ' + getTimeDiff(data.start_time * 1000)
        else
          if (data.job_state === 'PENDING') {
            let eligibleTime = new Date(data.eligible_time * 1000)
            if (eligibleTime < new Date())
              startTime = '-'
            else
              startTime = 'within ' + getTimeDiff(data.eligible_time * 1000)
          } else
            if (data.job_state === 'RUNNING')
              startTime = 'since ' + getTimeDiff(data.start_time * 1000)
            else
              startTime = '-'

        return startTime
      }
    },
    { id: 'qos', name: 'QOS' },
    { id: 'partition', name: 'Partition' }
  ],
  classnames: {
    thead: {
      th: 'header'
    },
    tbody: {
      tr: 'jobs-row',
      td: ''
    }
  },
  ids: {
    thead: {
      th: () => { return 'header' },
      tr: () => { return '' },
      td: () => { return '' }
    },
    tbody: {
      self: () => { return 'jobs-tbody' },
      tr: (data) => { return 'tr-job-' + data.id },
      td: () => { return '' }
    }
  }
}

@fetchOnUpdate([], (params, actions) => {
  actions.fetchJobs()
  actions.fetchCluster()
})
@Radium
export default class Jobs extends React.Component {

  // statics
  // constructor
  // lifecycle methods (willmount...)
  // handlers
  // others
  // render@

  constructor (props, context) {
    super(props, context)
  }

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
    actions: PropTypes.object.isRequired,
    restAPI: PropTypes.object
  }

  handleRowClick (data) {
    showModalJob(data.id)
  }

  comp

  render () {
    const { restAPI: { jobs, cluster } } = this.props

    // transform jobs Object in an Array
    let datas = []
    for (let key in jobs) {
      datas.push(Object.assign({ 'id': key }, jobs[key]))
    }

    return (
      <div id='jobs' className='main' style={[ styles.base, styles.jobs ]}>
        <h1 className='page-header'>Jobs</h1>

        <Plots datas={datas} cluster={cluster} />

        <Table
          datas={datas}
          config={CONFIG}
          onRowClick={this.handleRowClick}
        />
      </div>
    )
  }
}
