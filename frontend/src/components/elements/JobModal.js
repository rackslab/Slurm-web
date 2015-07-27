import React from 'react'
import Radium from 'radium'


@Radium
export default class JobModal extends React.Component {

  static propTypes = {}

  constructor (props, context) {
    super(props, context)
  }

  render () {

    return (
      <div
        className='modal fade'
        id='modal-job'
        tabIndex='-1'
        role='dialog'
        aria-labelledby='myModalLabel'
        aria-hidden='true'
      >
        <div className='modal-dialog'>
          <div className='modal-content'>
            <div className='modal-header'>
              <button
                type='button'
                className='close'
                data-dismiss='modal'
                aria-label='Close'
              >
                <span aria-hidden='true'>&times;</span>
              </button>
              <h4 className='modal-title' id='modal-job-title'></h4>
            </div>
            <div className='modal-body' id='modal-job-body'></div>
            <div className='modal-footer'>
              <button
                type='button'
                className='btn btn-default'
                data-dismiss='modal'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
