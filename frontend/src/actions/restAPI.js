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

export function fetchJobs () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_JOBS)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_JOBS,
      jobs: res
    }))
  }
}


export function fetchCluster () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_CLUSTER)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_CLUSTER,
      cluster: res
    }))
  }
}

export function fetchRacks () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_RACKS)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_RACKS,
      racks: res
    }))
  }
}

export function fetchNodes () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_NODES)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_NODES,
      nodes: res
    }))
  }
}

export function fetchPartitions () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_PARTITIONS)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_PARTITIONS,
      partitions: res
    }))
  }
}

export function fetchQOS () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_QOS)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_QOS,
      qos: res
    }))
  }
}

export function fetchReservations () {
  return dispatch => {
    // TODO: handle errors
    fetch(REST_RESERVATIONS)
    .then(res => res.json())
    .then(res => dispatch({
      type: constants.FETCH_RESERVATIONS,
      reservations: res
    }))
  }
}
