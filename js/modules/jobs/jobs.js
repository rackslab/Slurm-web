define(['jquery', 'handlebars', 'text!../../js/modules/jobs/jobs.hbs', 'text!../../js/modules/jobs/modal-job.hbs',  'text!config.json', 'token-utils', 'tablesorter-utils', 'cluster-utils', 'jobs-utils', 'date-utils', 'jquery-tablesorter', 'jquery-flot', 'jquery-flot-pie', 'boolean-utils', 'helpers-utils', 'bootstrap'], function ($, Handlebars, template, modalTemplate, config, token, tablesorter, cluster) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);

  return function () {
    this.interval = null;
    this.tablesorterOptions = {};

    function closeModal(e) {
      e.stopPropagation();

      $('#modal-job').remove();
    }

    function toggleModal(jobId) {
      var options = {
        type: 'POST',
        dataType: 'json',
        crossDomain: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken()
        })
      };

      $.ajax(config.apiURL + config.apiPath + '/job/' + jobId, options)
        .success(function (job) {
          var context = {
            job: job
          };

          $('body').append(modalTemplate(context));
          $('#modal-job').on('hidden.bs.modal', closeModal);
          $('#modal-job').modal('show');
        });
    }

    $(document).on('modal-job', function (e, options) {
      e.stopPropagation();

      toggleModal(options.jobId);
    });

    this.init = function () {
      var self = this;
      var options = {
        type: 'POST',
        dataType: 'json',
        crossDomain: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken()
        })
      };

      $.ajax(config.apiURL + config.apiPath + '/jobs', options)
        .success(function (jobs) {
          var context = {
            count: Object.keys(jobs).length,
            jobs: jobs
          };
          var plotParams = {
            series: {
              pie: {
                show: true,
              }
            }
          };

          $('body').append(template(context));
          $('.tablesorter').tablesorter(self.tablesorterOptions);

          var dataAllocatedCores = [
            {
              label: 'allocated',
              data: 0
            }, {
              label: 'idle',
              data: 0
            }
          ];

          var QOSStats = {};
          var partStats = {};

          var index;
          var job;
          for (index in jobs) {
            if (jobs.hasOwnProperty(index)) {
              job = jobs[index];

              if (job.hasOwnProperty('job_state') &&
                  job.hasOwnProperty('qos') &&
                  job.hasOwnProperty('partition') &&
                  (job.job_state === 'RUNNING' || job.job_state === 'COMPLETED')) {
                if (!QOSStats.hasOwnProperty(job.qos)) {
                  QOSStats[job.qos] = { cores: 0, nodes: 0 };
                }
                if (!partStats.hasOwnProperty(job.partition)) {
                  partStats[job.partition] = { cores: 0, nodes: 0 };
                }
                if (job.hasOwnProperty('num_cpus')) {
                  QOSStats[job.qos].cores += job.num_cpus;
                  partStats[job.partition].cores += job.num_cpus;
                  dataAllocatedCores[0].data += job.num_cpus;
                }
                if (job.hasOwnProperty('num_nodes')) {
                  QOSStats[job.qos].nodes += job.num_nodes;
                  partStats[job.partition].nodes += job.num_nodes;
                }
              }
            }
          }

          dataAllocatedCores[1].data += cluster.getClusterAsync().cores - dataAllocatedCores[0].data;

          var dataQOSNodes = [];
          var dataQOSCores = [];

          var QOS;
          for (QOS in QOSStats) {
            if (QOSStats.hasOwnProperty(QOS)) {
              dataQOSNodes.push({ label: QOS, data: QOSStats[QOS].nodes });
              dataQOSCores.push({ label: QOS, data: QOSStats[QOS].cores });
            }
          }

          var dataPartNodes = [];
          var dataPartCores = [];

          var part;
          for (part in partStats) {
            if (partStats.hasOwnProperty(part)) {
              dataPartNodes.push({ label: part, data: partStats[part].nodes });
              dataPartCores.push({ label: part, data: partStats[part].cores });
            }
          }

          $.plot('#plot-alloc-cores', dataAllocatedCores, plotParams);
          $.plot('#plot-part-nodes', dataPartNodes, plotParams);
          $.plot('#plot-part-cores', dataPartCores, plotParams);
          $.plot('#plot-qos-nodes', dataQOSNodes, plotParams);
          $.plot('#plot-qos-cores', dataQOSCores, plotParams);

        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        self.tablesorterOptions = tablesorter.findTablesorterOptions('.tablesorter');
        $('#jobs').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#modal-job').off('hidden.bs.modal'),
      $('#jobs').parent('.container-fluid').remove();
      $('.modal').remove();
    };

    return this;
  };
});
