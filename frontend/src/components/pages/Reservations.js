import React, { PropTypes } from 'react'
import Radium from 'radium'
import { fetchOnUpdate } from '../../decorators'
import Table from '../elements/table/Table'

const styles = {
  base: {
    padding: '20px 40px'
  }
}

const CONFIG = {
  columns: [
    { id: 'id', name: 'Name' },
    { id: 'users', name: 'Users' },
    { id: 'node_list', name: 'Nodes' },
    { id: 'start', name: 'Start', format: (data) => {
        return (new Date(data.start_time * 1000)).toString()
      }
    },
    { id: 'end', name: 'End', format: (data) => {
        return (new Date(data.end_time * 1000)).toString()
      }
    }
  ],
  classnames: {
    thead: {
      th: 'header'
    },
    tbody: {
      tr: 'reservations-row',
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
      self: () => { return 'reservations-tbody' },
      tr: (data) => { return 'tr-reservation-' + data.id },
      td: () => { return '' }
    }
  }
}


@fetchOnUpdate([], (params, actions) => {
  actions.fetchReservations()
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
    const { restAPI: { reservations } } = this.props

    // transform partitions Object in an Array
    let datas = []
    for (let key in reservations) {
      datas.push(Object.assign({ 'id': key }, reservations[key]))
    }

    return (
      <div id='reservations' className='main' style={[styles.base]}>
        <h1 className='page-header'>Reservations</h1>

        <Table
          datas={datas}
          config={CONFIG} />
      </div>
    )
  }
}
