import React, { PropTypes } from 'react'
import Radium from 'radium'


@Radium
export default class Row extends React.Component {

  static propTypes = {
    datas: PropTypes.any.isRequired,
    onClick: PropTypes.func,
    config: PropTypes.object.isRequired,
    header: PropTypes.bool
  }

  render () {
    const { config, datas, header } = this.props

    let cells = header ? datas.map( (data) => {

        return (
          <th
            id={config.ids.thead.th(datas)}
            className={config.classnames.thead.th}
          >
            { data }
          </th>
        )
      }) :

      config.columns.map( (column) => {

        return (
          column.hasOwnProperty('format') ?
          column.format(datas) :
          datas[column.id]
        )
      }).map( (data) => {

        return (
          <td
            id={config.ids.tbody.td(datas)}
            className={config.classnames.tbody.td}
          >
            { data }
          </td>
        )
      })

    return (
      <tr
        id={
          header ? config.ids.thead.tr(datas) : config.ids.tbody.tr(datas)
        }
        className={
          header ? config.classnames.thead.tr : config.classnames.tbody.tr
        }
        onClick={
          this.props.onClick ? this.props.onClick.bind(this, datas) : undefined
        }
      >
        { cells }
      </tr>
    )
  }
}
