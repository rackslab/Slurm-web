import React, { PropTypes } from 'react'
import Radium from 'radium'
import Row from './Row'


@Radium
export default class Table extends React.Component {

  static propTypes = {
    datas: PropTypes.array.isRequired,
    config: PropTypes.object.isRequired,
    onRowClick: PropTypes.func
  }

  render () {

    const { config, datas, onRowClick } = this.props

    let rows = datas.map( (data) => {
      return (
        <Row
          datas={data}
          config={config}
          onClick={onRowClick}
        />)
    })

    let columns = config.columns.map( (column) => {
      return column.name
    })


    return (
      <table cellSpacing='0' className='table table-striped tablesorter'>
        <thead
          id={config.ids.thead.self}
          className={config.classnames.thead.self}
        >
          <Row
            datas={columns}
            config={config}
            header={true}
          />
        </thead>
        <tbody
          id={config.ids.tbody.self}
          className={config.classnames.tbody.self}
        >
          { rows }
        </tbody>
      </table>
    )
  }
}
