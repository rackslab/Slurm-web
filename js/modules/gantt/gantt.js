define(['jquery', 'handlebars', 'text!../../js/modules/gantt/gantt.hbs', 'text!../../js/modules/jobs/modal-job.hbs', 'text!config.json', 'token-utils', 'jobs-utils', 'nodes-utils'], function ($, Handlebars, template, modalTemplate, config, token, jobs, nodes) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);

  function computeJobs (jobsByNodes) {
    var jobs = [];
    var positionY = 0;
    var previousJobId = null;
    var currentUnixTimestamp = Date.now() / 1000 | 0;
    var chartStartTimestamp = currentUnixTimestamp;

    for (var nodeId in jobsByNodes) {
      for (var jobId in jobsByNodes[nodeId]) {
        chartStartTimestamp = Math.min(chartStartTimestamp, jobsByNodes[nodeId][jobId].start_time);
      }
    }
    chartStartTimestamp = Math.max(chartStartTimestamp, currentUnixTimestamp - 3600);

    var abscissaValue = currentUnixTimestamp - chartStartTimestamp;

    for (var nodeId in jobsByNodes) {
      for (var jobId in jobsByNodes[nodeId]) {
        if (previousJobId && jobId === previousJobId) {
          var job = jobs[jobs.length - 1];

          job.height += 25 / Object.keys(jobsByNodes[nodeId]).length;
        } else {
          var job = jobsByNodes[nodeId][jobId];

          job.id = jobId;
          // set height for job's line (height's unit in pixels)
          job.height = 25 / Object.keys(jobsByNodes[nodeId]).length;
          job.positionY = (jobs.length ? jobs[jobs.length - 1].height + jobs[jobs.length - 1].positionY : 0) + positionY;
          // set width for job's line (width's unit in percents)
          job.width = (Math.min(currentUnixTimestamp, job.end_time) - Math.max(job.start_time, chartStartTimestamp)) / abscissaValue * 100;
          job.positionX = (Math.max(job.start_time, chartStartTimestamp) - chartStartTimestamp) / abscissaValue * 100;

          // reset markers
          positionY = 0;
          previousJobId = jobId;

          jobs.push(job);
        }
      }

      if (!Object.keys(jobsByNodes[nodeId]).length) {
        previousJobId = null;
        positionY += 25;
      }
    }

    return jobs;
  }

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

  return function () {

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

      $.ajax(config.apiURL + config.apiPath + '/jobs-by-nodes', options)
        .success(function (jobsByNodes) {
          var context = {
            nodes:  Object.keys(jobsByNodes),
            jobs:   computeJobs(jobsByNodes),
            height: Object.keys(jobsByNodes).length * 25
          }

          $('body').append(template(context));

          $(".job").on('click', function (e) {
            e.preventDefault();

            var jobId = $(e.target).data('id');
            $(document).trigger('modal-job', { jobId: jobId });
          });
        });

      $(document).on('modal-job', function (e, options) {
        e.stopPropagation();

        toggleModal(options.jobId);
      });
    }

    this.destroy = function () {
      $('#gantt').parent('.container-fluid').remove();
    }

    return this;
  };
});
