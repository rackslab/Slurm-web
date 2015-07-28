import React, { PropTypes } from 'react'
import Radium from 'radium'
// import RestAPIJobs from '../restAPI/Jobs'
import { fetchOnUpdate } from '../../decorators'
import Table from '../elements/table/Table'


const styles = {
  base: {
    padding: '20px 40px'
  },
  jobs: {}
}

const CONFIG = {
  columns: [
    { id: 'id', name: 'Name' },
    { id: 'default', name: 'Default', format: (data) => {
        return ((data.flags.Default === 1) ? 'Yes' : 'No' )
      }
    },
    { id: 'nodes', name: 'Nodes', format: (data) => {
        return data.nodes.join(',')
      }
    },
    { id: 'total_nodes', name: '#Nodes' },
    { id: 'total_cpus', name: '#CPUs' }
  ],
  classnames: {
    thead: {
      th: 'header'
    },
    tbody: {
      tr: 'paritions-row',
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
      self: () => { return 'part-tbody' },
      tr: (data) => { return 'tr-partition-' + data.id },
      td: () => { return '' }
    }
  }
}

@fetchOnUpdate([], (params, actions) => {
  actions.fetchPartitions()
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
    const { restAPI: { partitions } } = this.props

    // transform partitions Object in an Array
    let datas = []
    for (let key in partitions) {
      datas.push(Object.assign({ 'id': key }, partitions[key]))
    }

    return (
      <div id='partitions' className='main' style={[styles.base]}>
        <h1 className='page-header'>Partitions</h1>

        <Table
          datas={datas}
          config={CONFIG}
        />
      </div>
    )
  }
}
