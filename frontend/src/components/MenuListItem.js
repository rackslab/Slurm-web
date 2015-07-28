import React, { PropTypes } from 'react'
import { Link } from 'react-router'

export default class MenuListItem {

  static propTypes = {
    isExternal: PropTypes.bool,
    link: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  }

  static defaultProps = { isExternal: false }

  render () {
    return (
      <li>
        {this.renderLink()}
      </li>
    )
  }

  renderLink () {
    if (this.props.isExternal)
      return (
        <a href={this.props.link} target="_blank">
          {this.props.text}
        </a>
      )
    else
      return (
        <Link to={this.props.link}>
          {this.props.text}
        </Link>
      )
  }
}
