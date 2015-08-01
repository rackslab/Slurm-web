import 'whatwg-fetch'
import * as constants from '../constants'

const REST_URI = constants.REST_URI
const REST_JOBS = `${REST_URI}/jobs`
const REST_CLUSTER = `${REST_URI}/cluster`
const REST_RACKS = `${REST_URI}/racks`
const REST_NODES = `${REST_URI}/nodes`
const REST_PARTITIONS = `${REST_URI}/partitions`
const REST_QOS = `${REST_URI}/qos`
const REST_RESERVATIONS = `${REST_URI}/reservations`

function fetchOptions (props) {
  return {
    method: 'POST',
    crossDomain: true,
    type: 'json',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: props.jwt
    })
  }
}

export function fetchJobs (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_JOBS, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_JOBS,
      jobs: res
    }))
  }
}


export function fetchCluster (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_CLUSTER, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_CLUSTER,
      cluster: res
    }))
  }
}

export function fetchRacks (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_RACKS, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_RACKS,
      racks: res
    }))
  }
}

export function fetchNodes (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_NODES, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_NODES,
      nodes: res
    }))
  }
}

export function fetchPartitions (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_PARTITIONS, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_PARTITIONS,
      partitions: res
    }))
  }
}

export function fetchQOS (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_QOS, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_QOS,
      qos: res
    }))
  }
}

export function fetchReservations (props) {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_RESERVATIONS, fetchOptions(props))
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_RESERVATIONS,
      reservations: res
    }))
  }
}
