import React, { Component } from 'react'
import LoginStore from '../stores/LoginStore'
// import RouterContainer from '../services/RouterContainer'

const debug = require('debug')('slurm-web:AuthenticatedComponent.js')

export default (ComposedComponent) => {
  return class AuthenticatedComponent extends Component {

    constructor () {
      super()
      this.state = this._getLoginState()
    }

    _getLoginState () {
      return {
        userLoggedIn: LoginStore.isLoggedIn(),
        user: LoginStore.user,
        jwt: LoginStore.jwt
      }
    }

    componentWillMount () {
      if (!LoginStore.isLoggedIn())
        window.location = '/login'
    }

    componentDidMount () {
      this.changeListener = this._onChange.bind(this)
      LoginStore.addChangeListener(this.changeListener)
    }

    _onChange () {
      this.setState(this._getLoginState())
    }

    componentWillUnmount () {
      LoginStore.removeChangeListener(this.changeListener)
    }

    render () {
      return (
        <ComposedComponent
          {...this.props}
          user={this.state.user}
          jwt={this.state.jwt}
          userLoggedIn={this.state.userLoggedIn} />
      )
    }
  }
}
