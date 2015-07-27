/* global $ */

// the maximum number of chars in nodesets in jobs view before being cut
export const maxNodesLen = 25

const apiDir = 'http://server:8000/slurm-restapi'
const theOrigin = new Date('01/01/1970')

export function getTimeDiff (datetime) {
    let _date = new Date().getTime()

    if (isNaN(datetime))
      return ''

    let diff = Math.abs(datetime - _date) - (isDst() ? 60 * 60 * 1000 : 0)

    let days = Math.floor(diff / 1000 / 60 / (60 * 24))
    let dateDiff = new Date(diff)

    return (days <= 0 ? '' : days + 'd ')
        + (dateDiff.getHours() === 0 ? '' : dateDiff.getHours() + 'h ')
        + (dateDiff.getMinutes() === 0 ? '' : dateDiff.getMinutes() + 'min ')
        + (dateDiff.getSeconds() === 0 ? '' : dateDiff.getSeconds() + 's')
}

function isDst () {
    let _t = new Date()
    let jan = new Date(_t.getFullYear(), 0, 1)
    let jul = new Date(_t.getFullYear(), 6, 1)
    return (
      Math.min(
        jan.getTimezoneOffset(),
        jul.getTimezoneOffset()
      ) === _t.getTimezoneOffset()
    )
}

function newDate (date) {
  let d = new Date(date)
  if (d <= theOrigin)
    return 'N/A'
  else
    return d
}

export function showModalJob (jobId) {
  $.getJSON(apiDir + '/job/' + jobId,
    function (job) {
      $('#modal-job-title').text('job ' + jobId)

      let startTime = newDate(job.start_time * 1000)
      let eligibleTime = newDate(job.eligible_time * 1000)
      let endTime = newDate(job.end_time * 1000)

      let stateReason = job.state_reason === 'None' ? '-' : job.state_reason
      let command = job.command === null ? '-' : job.command
      let exclusive = job.shared === 0 ? 'yes' : 'no'

      let jobDetails = '<ul>'
        + '<li>user: ' + job.login + ' (' + job.username + ')</li>'
        + '<li>state: ' + job.job_state + '</li>'
        + '<li>reason: ' + stateReason + '</li>'
        + '<li>nodes: ' + job.nodes + ' (' + job.num_nodes + ')</li>'
        + '<li>cores: ' + job.num_cpus + '</li>'
        + '<li>account: ' + job.account + '</li>'
        + '<li>QOS: ' + job.qos + '</li>'
        + '<li>partition: ' + job.partition + '</li>'
        + '<li>exclusive: ' + exclusive + '</li>'
        + '<li>command: ' + command + '</li>'
        + '<li>start time: ' + startTime + '</li>'
        + '<li>eligible time: ' + eligibleTime + '</li>'
        + '<li>end time: ' + endTime + '</li>'
        + '<li>time limit: ' + job.time_limit + ' mins</li>'
        + '</ul>'
      $('#modal-job-body').empty()
      $('#modal-job-body').append(jobDetails)
      $('#modal-job').modal('show')
    }
  )
}


export function fixNumber (num) {
  let infinite = parseInt('0xffffffff', 16)
  let noVal = parseInt('0xfffffffe', 16)

  return (num === infinite || num === noVal ? '-' : num)
}


export function minutesToDelay (minutes) {
    if (isNaN(minutes)) return minutes

    let days = Math.floor(minutes / 1440)
    minutes -= days * 1440
    let hours = Math.floor(minutes / 60) % 24
    minutes -= hours * 60

    return (days === 0 ? '' : days + 'd ')
        + (hours === 0 ? '' : hours + 'h ')
        + (minutes === 0 ? '' : minutes + 'm')
}
