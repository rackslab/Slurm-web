import React, { PropTypes } from 'react'
import Modal from 'react-modal'
import Radium from 'radium'
import { newDate } from '../../utils/utils'

// const debug = require('debug')('slurm-web:JobModal.js')

const styles = {
  backgroundColor: 'transparent',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
}

@Radium
export default class JobModal extends React.Component {

  static propTypes = {
    job: PropTypes.object,
    isOpen: PropTypes.bool.isRequired,
    closeModal: PropTypes.func
  }

  renderModalContent () {
    let job = this.props.job

    let startTime = newDate(job.start_time * 1000).toString()
    let eligibleTime = newDate(job.eligible_time * 1000).toString()
    let endTime = newDate(job.end_time * 1000).toString()
    let stateReason = job.state_reason === 'None' ?
      '-' : job.state_reason
    let command = job.command === null ? '-' : job.command
    let exclusive = job.shared === 0 ? 'yes' : 'no'

    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={this.props.closeModal}
        style={styles}
      >

        <div className='modal-dialog'>
          <div className='modal-content'>
            <div className='modal-header'>
              <button
                type='button'
                className='close'
                data-dismiss='modal'
                aria-label='Close'
                onClick={this.props.closeModal.bind(this)}
              >
                <span aria-hidden='true'>&times;</span>
              </button>
              <h4 className='modal-title' id='modal-job-title'>
                Job {job.id}
              </h4>
            </div>

            <div className='modal-body' id='modal-job-body'>
              <ul>
                <li>User: {job.login} ({job.username})</li>
                <li>State: {job.job_state}</li>
                <li>Reason: {stateReason}</li>
                <li>Nodes: {job.nodes} ({job.num_nodes})</li>
                <li>Cores: {job.num_cpus}</li>
                <li>Account: {job.account}</li>
                <li>QOS: {job.qos}</li>
                <li>Partition: {job.partition}</li>
                <li>Exclusive: {exclusive}</li>
                <li>Command: {command}</li>
                <li>Start Time: {startTime}</li>
                <li>Eligible Time: {eligibleTime}</li>
                <li>End Time: {endTime}</li>
                <li>Time Limit: {job.time_limit}</li>
              </ul>
            </div>

            <div className='modal-footer'>
              <button
                type='button'
                className='btn btn-default'
                data-dismiss='modal'
                onClick={this.props.closeModal.bind(this)}
              >
                Close
              </button>
            </div>
          </div>
        </div>

      </Modal>
    )
  }

  render () {

    let modal = this.props.job ? this.renderModalContent() : null

    return (
      <div
        className='modal fade'
        id='modal-job'
        tabIndex='-1'
        role='dialog'
        aria-labelledby='myModalLabel'
        aria-hidden='true'
      >
        {modal}
      </div>
    )
  }
}
