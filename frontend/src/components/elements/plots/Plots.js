import React, { PropTypes } from 'react'
import Radium from 'radium'
import { PieChart } from 'react-d3'
import * as config from './config'

// const debug = require('debug')('slurm-web:plots/Plots.js')

const styles = {
  plotJobs: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  plotSubDiv: {
    width: '100%',
    /* trick to center fixed width element within responsive sized block */
    position: 'relative',
    right: 0,
    left: 0,
    marginRight: 'auto',
    marginLeft: 'auto'
  }
}

@Radium
export default class Plots extends React.Component {

  static propTypes = {
    datas: PropTypes.array.isRequired,
    cluster: PropTypes.object.isRequired
  }

  computeStats (jobs, cluster) {
    if (jobs.length === 0) return false

    let qosstats = {}
    let partstats = {}
    let nbAllocCores = 0

    /* compute stats about part and qos */
    for (let key of Object.keys(jobs)) {
      let job = jobs[key]

      if (job.job_state === 'RUNNING' || job.job_state === 'COMPLETED') {

        if (qosstats.hasOwnProperty(job.qos)) {
          qosstats[job.qos]['cores'] += job.num_cpus
          qosstats[job.qos]['nodes'] += job.num_nodes
        } else {
          qosstats[job.qos] = {}
          qosstats[job.qos]['cores'] = job.num_cpus
          qosstats[job.qos]['nodes'] = job.num_nodes
        }

        if (partstats.hasOwnProperty(job.partition)) {
          partstats[job.partition]['cores'] += job.num_cpus
          partstats[job.partition]['nodes'] += job.num_nodes
        } else {
          partstats[job.partition] = {}
          partstats[job.partition]['cores'] = job.num_cpus
          partstats[job.partition]['nodes'] = job.num_nodes
        }
        nbAllocCores += job.num_cpus
      }
    }

    let dataAllocCores = [
      { label: 'allocated', value: nbAllocCores },
      { label: 'idle', value: cluster.cores - nbAllocCores }
    ]
    let dataQosNodes = []
    let dataQosCores = []

    for (let qos in qosstats) {
      // use hasOwnProperty to filter out keys from the Object.prototype
      if (qosstats.hasOwnProperty(qos)) {
        dataQosNodes.push({ label: qos, value: qosstats[qos]['nodes'] })
        dataQosCores.push({ label: qos, value: qosstats[qos]['cores'] })
      }
    }

    let dataPartNodes = []
    let dataPartCores = []

    for (let part in partstats) {
      // use hasOwnProperty to filter out keys from the Object.prototype
      if (partstats.hasOwnProperty(part)) {
        dataPartNodes.push({ label: part, value: partstats[part]['nodes'] })
        dataPartCores.push({ label: part, value: partstats[part]['cores'] })
      }
    }

    return {
      allocCores: dataAllocCores,
      partNodes: dataPartNodes,
      partCores: dataPartCores,
      qosNodes: dataQosNodes,
      qosCores: dataQosCores
    }

  }

  plotRendering (datas, options) {
    if (!datas) return null

    return (
      <PieChart
        data={datas}
        width={options.width}
        height={options.height}
        radius={options.radius}
        innerRadius={0}
        valueTextFill={"rgba(0,0,0,0)"} // to hide values on chart
      />
    )
  }

  render () {
    let datas = this.computeStats(this.props.datas, this.props.cluster)

    return (
      <div
        className='pane row placeholders'
        id='plotjobs'
        style={[styles.plotJobs]}
      >
        <div id='alloc-cores' className='col-xs-6 col-sm-4 placeholder'>
          <div className='plot-sub-div' style={[styles.plotSubDiv]}>
            <div
              id='plot-alloc-cores'
              className='plot-div'
              style={[styles.plotDiv]}
            >
              {this.plotRendering(datas.allocCores, config.bigPlot)}
            </div>
          </div>
          <h4>Allocated cores</h4>
        </div>
        <div id='part-nodes' className='col-xs-6 col-sm-2 placeholder'>
          <div className='plot-sub-div' style={[styles.plotSubDiv]}>
            <div
              id='plot-part-nodes'
              className='plot-div-small'
              style={[styles.plotDivSmall]}
            >
              {this.plotRendering(datas.partNodes, config.smallPlot)}
            </div>
          </div>
          <h4>Nodes/Partition</h4>
        </div>
        <div id='part-cores' className='col-xs-6 col-sm-2 placeholder'>
          <div className='plot-sub-div' style={[styles.plotSubDiv]}>
            <div
              id='plot-part-cores'
              className='plot-div-small'
              style={[styles.plotDivSmall]}
            >
              {this.plotRendering(datas.partCores, config.smallPlot)}
            </div>
          </div>
          <h4>Cores/Partition</h4>
        </div>
        <div id='qos-nodes' className='col-xs-6 col-sm-2 placeholder'>
          <div className='plot-sub-div' style={[styles.plotSubDiv]}>
            <div
              id='plot-qos-nodes'
              className='plot-div-small'
              style={[styles.plotDivSmall]}
            >
              {this.plotRendering(datas.qosNodes, config.smallPlot)}
            </div>
          </div>
          <h4>Nodes/QOS</h4>
        </div>
        <div id='qos-cores' className='col-xs-6 col-sm-2 placeholder'>
          <div className='plot-sub-div' style={[styles.plotSubDiv]}>
            <div
              id='plot-qos-cores'
              className='plot-div-small'
              style={[styles.plotDivSmall]}
            >
              {this.plotRendering(datas.qosCores, config.smallPlot)}
            </div>
          </div>
          <h4>Cores/QOS</h4>
        </div>
      </div>
    )
  }
}
