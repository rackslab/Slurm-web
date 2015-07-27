import * as constants from '../constants'

const initialState = {
  jobs: {},
  cluster: {},
  racks: {},
  nodes: {},
  partitions: {},
  qos: {},
  reservations: {}
}

const actionsMap = {
  [constants.FETCH_JOBS]: (state, action) => (
    { jobs: action.jobs }
  ),
  [constants.FETCH_CLUSTER]: (state, action) => (
    { cluster: action.cluster }
  ),
  [constants.FETCH_RACKS]: (state, action) => (
    { racks: action.racks }
  ),
  [constants.FETCH_NODES]: (state, action) => (
    { nodes: action.nodes }
  ),
  [constants.FETCH_PARTITIONS]: (state, action) => (
    { partitions: action.partitions }
  ),
  [constants.FETCH_QOS]: (state, action) => (
    { qos: action.qos }
  ),
  [constants.FETCH_RESERVATIONS]: (state, action) => (
    { reservations: action.reservations }
  )
}

export default function restAPI (state = initialState, action) {
  const reduceFn = actionsMap[action.type]

  if (!reduceFn) return state

  return Object.assign({}, state, reduceFn(state, action))
}
