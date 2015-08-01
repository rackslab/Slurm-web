import React, { PropTypes } from 'react'
import Radium from 'radium'
import { fetchOnUpdate } from '../../decorators'
import Rack from '../elements/racks/Rack'
import Legend from '../elements/racks/Legend'
import authenticatedComponent from '../../decorators/AuthenticatedComponent'


const styles = {
  base: {
    padding: '20px 40px'
  }
}


@authenticatedComponent
@fetchOnUpdate([], function (params, actions, props) {
  actions.fetchRacks(props)
  actions.fetchJobs(props)
  actions.fetchNodes(props)
})
@Radium
export default class JobsMap extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
    actions: PropTypes.object.isRequired,
    restAPI: PropTypes.object
  }

  buildAllocatedCpus (jobs) {

    let allocatedCpus = {}
    let nodesCpus

    // build hash with this format:
    //   allocatedCpus['node'] = { "jobid1": nb_cores, "jobid2" : nb_cores }
    for (let job in jobs) {
      if (jobs.hasOwnProperty(job))
        if (jobs[job]['job_state'] === 'RUNNING') {
          nodesCpus = jobs[job]['cpus_allocated']
          for (let node in nodesCpus) {
            if (!allocatedCpus.hasOwnProperty(node))
              allocatedCpus[node] = {}

            allocatedCpus[node][job] = nodesCpus[node]
          }
        }
    }

    return allocatedCpus
  }

  loadJobsmap (jobs, racks, slurmnodes) {

    let allocatedCpus = this.buildAllocatedCpus(jobs)

    let datas = []
    for (let key in racks) {
      datas.push(Object.assign({ 'id': key }, racks[key]))
    }

    return datas.map( (rack) => {
      return (
        <Rack
          rack={rack}
          slurmnodes={slurmnodes}
          allocatedCpus={allocatedCpus}
        />
      )
    })
  }

  render () {
    const { restAPI: { racks, jobs, nodes } } = this.props

    let jobsmap

    if (Object.keys(racks).length && Object.keys(nodes).length)
      jobsmap = this.loadJobsmap(jobs, racks, nodes)

    return (
      <div id='racks' className='main' style={[styles.base]}>
        <h1 className='page-header'>Jobs Map</h1>
        <div id='jobmap-cont' className='pane'>
          <Legend isJobsMap={true} />
          {jobsmap}
        </div>
      </div>
    )
  }
}
