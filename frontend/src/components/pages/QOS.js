import React, { PropTypes } from 'react'
import Radium from 'radium'
import { fetchOnUpdate } from '../../decorators'
import Table from '../elements/table/Table'
import { fixNumber, minutesToDelay } from '../../utils/utils'
import authenticatedComponent from '../../decorators/AuthenticatedComponent'

const styles = {
  base: {
    padding: '20px 40px'
  }
}

const CONFIG = {
  columns: [
    { id: 'id', name: 'Name' },
    { id: 'priority', name: 'Priority', format: (data) => {
        return fixNumber(data.priority)
      }
    },
    { id: 'max_wall_pj', name: 'Walltime', format: (data) => {
        return minutesToDelay(fixNumber(data.max_wall_pj))
      }
    },
    { id: 'grp_cpu_mins', name: 'Grp #CPU mins', format: (data) => {
        return fixNumber(data.grp_cpu_mins)
      }
    },
    { id: 'grp_cpu_run_mins', name: 'Grp #CPU min in Running',
      format: (data) => {
        return fixNumber(data.grp_cpu_run_mins)
      }
    },
    { id: 'grp_cpus', name: 'Grp #CPU', format: (data) => {
        return fixNumber(data.grp_cpus)
      }
    },
    { id: 'grp_jobs', name: 'Grp #Jobs', format: (data) => {
        return fixNumber(data.grp_jobs)
      }
    },
    { id: 'grp_mem', name: 'Grp Memory', format: (data) => {
        return fixNumber(data.grp_mem)
      }
    },
    { id: 'grp_nodes', name: 'Grp Nodes', format: (data) => {
        return fixNumber(data.grp_nodes)
      }
    },
    { id: 'grp_submit_jobs', name: 'Grp Submitted Jobs', format: (data) => {
        return fixNumber(data.grp_submit_jobs)
      }
    },
    { id: 'grp_wall', name: 'Grp Walltime', format: (data) => {
        return minutesToDelay(fixNumber(data.grp_wall))
      }
    },
    { id: 'max_cpu_mins_pj', name: 'Max CPU mins/Job', format: (data) => {
        return fixNumber(data.max_cpu_mins_pj)
      }
    },
    { id: 'max_cpu_run_mins_pu', name: 'Max CPU mins for Running jobs',
      format: (data) => {
        return fixNumber(data.max_cpu_run_mins_pu)
      }
    },
    { id: 'max_cpus_pj', name: 'Max #CPUs/Job', format: (data) => {
        return fixNumber(data.max_cpus_pj)
      }
    },
    { id: 'max_cpus_pu', name: 'Max #CPUs/User', format: (data) => {
        return fixNumber(data.max_cpus_pu)
      }
    },
    { id: 'max_jobs_pu', name: 'Max #Jobs/User', format: (data) => {
        return fixNumber(data.max_jobs_pu)
      }
    },
    { id: 'max_nodes_pj', name: 'Max #Nodes/Job', format: (data) => {
        return fixNumber(data.max_nodes_pj)
      }
    },
    { id: 'max_nodes_pu', name: 'Max #Nodes/User', format: (data) => {
        return fixNumber(data.max_nodes_pu)
      }
    },
    { id: 'max_submit_jobs_pu', name: 'Max Submit Jobs/User',
      format: (data) => {
        return fixNumber(data.max_submit_jobs_pu)
      }
    },
    { id: 'preempt_mode', name: 'Preempt Mode' },
    { id: 'grace_time', name: 'Preemption Grace Time', format: (data) => {
        return minutesToDelay(fixNumber(data.grace_time))
      }
    }
  ],
  classnames: {
    thead: {
      th: 'header'
    },
    tbody: {
      tr: 'qos-row',
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
      self: () => { return 'qos-tbody' },
      tr: (data) => { return 'tr-qos-' + data.id },
      td: () => { return '' }
    }
  }
}


@authenticatedComponent
@fetchOnUpdate([], (params, actions, props) => {
  actions.fetchQOS(props)
})
@Radium
export default class Partitions extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
    actions: PropTypes.object.isRequired,
    restAPI: PropTypes.object
  }

  render () {
    const { restAPI: { qos } } = this.props

    // transform qos Object in an Array
    let datas = []
    for (let key in qos) {
      datas.push(Object.assign({ 'id': key }, qos[key]))
    }

    return (
      <div id='qos' className='main' style={[styles.base]}>
        <h1 className='page-header'>QOS</h1>

        <Table
          datas={datas}
          config={CONFIG}
        />
      </div>
    )
  }
}
