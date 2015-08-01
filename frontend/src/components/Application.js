import React, { PropTypes } from 'react'
import Menu from './Menu'
import { connect } from 'redux/react'
import { bindActionCreators } from 'redux'
import * as restAPIActions from '../actions/restAPI'
import LoginStore from '../stores/LoginStore'
import AuthService from '../services/AuthService'


@connect(state => ({
  restAPI: state.restAPI
}))
export default class Application extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired
  }

  constructor (props, context) {
    super(props, context)
    this.state = this._getLoginState()
  }

  componentDidMount () {
    this.changeListener = this._onChange.bind(this)
    LoginStore.addChangeListener(this.changeListener)
  }

  componentWillUnmount () {
    LoginStore.removeChangeListener(this.changeListener)
  }

  _getLoginState () {
    return {
      userLoggedIn: LoginStore.isLoggedIn()
    }
  }

  _onChange () {
    this.setState(this._getLoginState())
  }

  logout (e) {
    e.preventDefault()
    AuthService.logout()
  }

  render () {
    const { dispatch } = this.props
    const actions = bindActionCreators(restAPIActions, dispatch)

    return (
      <div id='layout'>
        <Menu userLoggedIn={this.state.userLoggedIn} logout={this.logout} />

        <div id='main' className='container-fluid'>

          {/* this will render the child routes */}
          {this.props.children &&
            React.cloneElement(this.props.children, { actions, ...this.props })}
        </div>
      </div>
    )
  }
}
