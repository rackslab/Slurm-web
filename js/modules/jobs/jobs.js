define(['jquery', 'handlebars', 'text!/js/modules/jobs/jobs.hbs', 'text!/js/modules/jobs/jobs-modal.hbs',  'text!/js/core/config.json', 'jobs', 'date', 'boolean', 'token', 'tablesorter', 'jquery-flot', 'jquery-flot-pie'], function ($, Handlebars, template, modalTemplate, config, token) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);

  return function(cluster) {
    this.interval = null;

    // here link with event click
    function toggleModal(jobId) {
      var options = {
        method: 'POST',
        url: config.apiURL + config.apiPath + '/jobs/' + jobId,
        cache: false,
        type: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token.getToken()
        })
      };

      $.ajax(options)
        .success(function (job) {
          $('body').append(modalTemplate(job));
        });
    };

    function closeModal() {

    };

    this.init = function () {
      var options = {
        method: 'POST',
        url: config.apiURL + config.apiPath + '/jobs',
        cache: false,
        type: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token.getToken()
        })
      };
      var cluster = {};

      $.ajax($.extend(options, { async: false, url: config.apiURL + config.apiPath + '/cluster' })
        .success(data) {
          cluster = data;
        });

      $.ajax(options)
        .success(function (jobs) {
          var context = {
            jobs: jobs
          };
          var plot_params = {
            series: {
              pie: {
                show: true,
              }
            }
          };
          var dataAllocatedCores = [
            {
              label: 'allocated',
              data: 0
            }, {
              label: 'idle',
              data: 0
            }
          ];
          var dataQOSNodes = [];
          var DataQosCores = [];
          var dataPartNodes = [];
          var dataPartCores = [];

          jobs.forEach(function(job) {
            if (job.job_state === 'RUNNING' || job.job_state === 'COMPLETED') {
              dataQOSNodes.push({ label: job.qos, data: job.num_cpus });
              dataQOSCores.push({ label: job.qos, data: job.num_nodes });
              dataPartNodes.push({ label: job.partition, data: job.num_cpus });
              dataPartCores.push({ lable: job.partition, data: job.num_nodes });
              dataAllocatedCores[0].data += job.num_cpus;
            }
          });

          dataAllocatedCores[1].data += cluster.cores - job.num_cpus;

          $('body').append(modalTemplate(context));

          $.plot('#plot-alloc-cores', data_alloc_cores, plot_params);
          $.plot('#plot-part-nodes', data_part_nodes, plot_params);
          $.plot('#plot-part-cores', data_part_cores, plot_params);
          $.plot('#plot-qos-nodes', data_qos_nodes, plot_params);
          $.plot('#plot-qos-cores', data_qos_cores, plot_params);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#jobs').parent('.container-fluid').remove();
        self.init();
      }, config.refresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#jobs').parent('.container-fluid').remove();
      $('.modal').remove();
    };

    return this;
  };
});

