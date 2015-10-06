define([
  'jquery',
  'token-utils'
], function ($, tokenUtils) {
  return {
    getJobs: function (config) {
      var slurmJobs = null;
      var options = {
        type: 'POST',
        dataType: 'json',
        async: false,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: tokenUtils.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', options)
        .success(function (jobs) {
          slurmJobs = jobs;
        })
        .error(function () {
          $(document).trigger('show', { page: 'login' });
        });

      return slurmJobs;
    },
    buildAllocatedCPUs: function (jobs) {
      var allocatedCPUs = {};
      var nodesCPUs = null;
      var job;
      var node;

      for (job in jobs) {
        if (jobs.hasOwnProperty(job) && jobs[job].job_state === 'RUNNING') {
          nodesCPUs = jobs[job].cpus_allocated;
          for (node in nodesCPUs) {
            if (nodesCPUs.hasOwnProperty(node)) {
              if (!allocatedCPUs.hasOwnProperty(node)) {
                allocatedCPUs[node] = {};
              }
              allocatedCPUs[node][job] = nodesCPUs[node];
            }
          }
        }
      }

      return allocatedCPUs;
    }
  };
});
