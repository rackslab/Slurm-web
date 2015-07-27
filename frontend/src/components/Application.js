import React, { PropTypes } from 'react'
// import classnames from 'classnames'
import Menu from './Menu'
import { connect } from 'redux/react'
import { bindActionCreators } from 'redux'
import * as restAPIActions from '../actions/restAPI'
import JobModal from './elements/JobModal'


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
  }

  render () {
    const { dispatch } = this.props
    const actions = bindActionCreators(restAPIActions, dispatch)

    return (
      <div id='layout'>
        <Menu/>

        <div id='main' className='container-fluid'>

          <JobModal />

          {/* this will render the child routes */}
          {this.props.children &&
            React.cloneElement(this.props.children, { actions, ...this.props })}
        </div>
      </div>
    )
  }
}
