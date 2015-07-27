import React, { PropTypes } from 'react'
import { Redirect, Router, Route } from 'react-router'
import { Provider } from 'redux/react'
import { createDispatcher, createRedux, composeStores } from 'redux'
import { loggerMiddleware, thunkMiddleware } from './middleware'
import * as components from './components'
import * as stores from './stores'

const {
  Application,
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

  render () {
    const { history } = this.props
    return (
      <Provider redux={redux}>
        {renderRoutes.bind(null, history)}
      </Provider>
    )
  }
}

function renderRoutes (history) {
  return (
    <Router history={history}>
      <Route component={Application} >
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
}
