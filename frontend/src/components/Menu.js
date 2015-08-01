import React, { PropTypes } from 'react'
import RadiumLink from './RadiumLink'
import MenuListItem from './MenuListItem'
import Radium from 'radium'

// for packing header
require('../assets/images/header.png')

const menuItems = [
  { text: 'Jobs', link: '/jobs' },
  { text: 'Racks', link: '/racks' },
  { text: 'JobsMap', link: '/jobsmap' },
  { text: 'Partitions', link: '/partitions' },
  { text: 'QOS', link: '/qos' },
  { text: 'Reservations', link: '/reservations' }
]

const styles = {
  navbar: {
    backgroundImage: 'url(/images/header.png)',
    backgroundRepeat: 'no-repeat',
    border: 0
  },

  navbarHeader: {
    'color': '#fff',
    marginLeft: 220
  }
}

@Radium
export default class Menu extends React.Component {

  static propTypes = {
    userLoggedIn: PropTypes.bool,
    logout: PropTypes.func
  }

  render () {

    const loggingLink = this.props.userLoggedIn ? (
      <li className="navbar-header">
        <a href='#' onClick={this.props.logout}>
          Logout
        </a>
      </li>
    ) : (
      <MenuListItem text='Login' link='/login' key='login' />
    )

    return (
      <div id="menu" ref="menu" className="navbar navbar-inverse
      navbar-fixed-top" style={[styles.navbar]}>
        <div className="container-fluid">
          <div className="navbar-brand">
            <RadiumLink
              to="/"
              className="navbar-header"
              style={[styles.navbarHeader]}
            >
              Slurm HPC Dashboard
            </RadiumLink>
          </div>
          <div className="navbar-collapse collapse">
            <ul className="nav navbar-nav navbar-right">
              {menuItems.map((item, i) => <MenuListItem {...item} key={i} />)}
              {loggingLink}
            </ul>
          </div>
        </div>
      </div>
    )
  }
}
