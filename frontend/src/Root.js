import React, { PropTypes } from 'react'
import { Redirect, Router, Route } from 'react-router'
import { Provider } from 'redux/react'
import { createDispatcher, createRedux, composeStores } from 'redux'
import { loggerMiddleware, thunkMiddleware } from './middleware'
import * as components from './components'
import * as stores from './stores'
import RouterContainer from './services/RouterContainer'

const {
  Application,
  Login,
  Jobs,
  Racks,
  JobsMap,
  Partitions,
  QOS,
  Reservations
} = components
const dispatcher = createDispatcher(
  composeStores(stores),
  getState => [ thunkMiddleware(getState), loggerMiddleware ]
)
const redux = createRedux(dispatcher)

export default class Root extends React.Component {

  static propTypes = {
    history: PropTypes.object.isRequired
  }

  constructor () {
    super()
  }

  renderRoutes (history) {
    let router = (
      <Router history={history}>
        <Route component={Application}>
          <Route path="login" component={Login} />
          <Route path="jobs" component={Jobs} />
          <Route path="racks" component={Racks} />
          <Route path="jobsmap" component={JobsMap} />
          <Route path="partitions" component={Partitions} />
          <Route path="qos" component={QOS} />
          <Route path="reservations" component={Reservations} />
          <Redirect from="/" to="/jobs" />
        </Route>
      </Router>
    )
    RouterContainer.set(router)

    return router
  }

  render () {
    const { history } = this.props

    return (
      <Provider redux={redux}>
        {this.renderRoutes.bind(null, history)}
      </Provider>
    )
  }
}
