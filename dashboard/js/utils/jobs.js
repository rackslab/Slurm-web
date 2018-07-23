/*
 * Copyright (C) 2015 EDF SA
 *
 * This file is part of slurm-web.
 *
 * slurm-web is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * slurm-web is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

define([
  'jquery',
  'token-utils'
], function($, tokenUtils) {
  return {
    buildAllocatedCPUs: function(jobs) {
      var allocatedCPUs = {},
        nodesCPUs = null,
        nodesCPUsLayout = null,
        job,
        node;

      for (job in jobs) {
        if (jobs.hasOwnProperty(job) && jobs[job].job_state === 'RUNNING') {
          nodesCPUs = jobs[job].cpus_allocated;
          if(jobs[job].hasOwnProperty('cpus_alloc_layout')){
            nodesCPUsLayout = jobs[job].cpus_alloc_layout;
          }
          for (node in nodesCPUs) {
            if (nodesCPUs.hasOwnProperty(node)) {
              if (!allocatedCPUs.hasOwnProperty(node)) {
                allocatedCPUs[node] = {};
              }
              allocatedCPUs[node][job] = nodesCPUs[node];
              if(nodesCPUsLayout !== null){
                allocatedCPUs[node]['layout']=nodesCPUsLayout[node];
              }
            }
          }
        }
      }

      return allocatedCPUs;
    }
  };
});
