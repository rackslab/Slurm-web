import React, { PropTypes } from 'react'
import shallowEqualScalar from 'redux/lib/utils/shallowEqualScalar'
import config from '../config'

function mapParams (paramKeys, params) {
  return paramKeys.reduce((acc, key) => {
    return Object.assign({}, acc, { [key]: params[key] })
  }, {})
}

export default function fetchOnUpdate (paramKeys, fn) {

  return DecoratedComponent =>
  class FetchOnUpdateDecorator extends React.Component {

    static propTypes = {
      actions: PropTypes.object.isRequired
    }

    componentWillMount () {
      let fnCall = () => {
        fn(mapParams(paramKeys, this.props.params), this.props.actions)
      }
      fnCall()
      this.intervalHandler = setInterval(fnCall, config.refresh.delay)
    }

    componentWillUnmount () {
      clearInterval(this.intervalHandler)
    }

    componentDidUpdate (prevProps) {
      const params = mapParams(paramKeys, this.props.params)
      const prevParams = mapParams(paramKeys, prevProps.params)

      if (!shallowEqualScalar(params, prevParams))
        fn(params, this.props.actions)
    }

    render () {
      return (
        <DecoratedComponent {...this.props} />
      )
    }
  }
}
