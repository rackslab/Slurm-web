define(['jquery', 'handlebars', 'text!../../js/modules/gantt/gantt.hbs', 'text!../../js/modules/jobs/modal-job.hbs', 'text!config.json', 'token-utils', 'jobs-utils', 'nodes-utils'], function ($, Handlebars, template, modalTemplate, config, token, jobs, nodes) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);

  function computeJobs (jobsByNodes) {
    var jobs = [],
        times = [],
        positionY = 0,
        previousJobId = null,
        currentUnixTimestamp = Date.now() / 1000 | 0,
        chartStartTimestamp = currentUnixTimestamp,
        timeScale = 1800, // seconds
        scaleFactor = 0.2;

    for (var nodeId in jobsByNodes) {
      for (var jobId in jobsByNodes[nodeId]) {
        chartStartTimestamp = Math.min(chartStartTimestamp, jobsByNodes[nodeId][jobId].start_time);
      }
    }
    // chartStartTimestamp = Math.max(chartStartTimestamp, currentUnixTimestamp - 3600);

    var timeRange = (currentUnixTimestamp - chartStartTimestamp);

    for (var i = 0; i * timeScale < timeRange; i++) {
      times.push({
        value: (i * timeScale / 3600) + "h",
        position: i * timeScale / timeRange * 100
      });
    }

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
          job.width = (Math.min(currentUnixTimestamp, job.end_time) - Math.max(job.start_time, chartStartTimestamp)) / timeRange * 100;
          job.positionX = (Math.max(job.start_time, chartStartTimestamp) - chartStartTimestamp) / timeRange * 100;

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

    return {
      jobs: jobs,
      times: times,
      width: timeRange * scaleFactor
    };
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
          var datas = computeJobs(jobsByNodes);
          var context = {
            nodes:  Object.keys(jobsByNodes),
            jobs:   datas.jobs,
            times:  datas.times,
            width:  datas.width,
            height: Object.keys(jobsByNodes).length * 25 + 50
          }

          $('body').append(template(context));

          // bind navbar
          // $('#tabs a').click(function (e) {
          //   e.preventDefault();
          //   $(this).tab('show');
          // });
          // $('#tabs a[href="#nodes"]').tab('show');

          // bind modal-job
          $(".job").on('click', function (e) {
            e.preventDefault();
            var jobId = $(e.target).data('id');
            $(document).trigger('modal-job', { jobId: jobId });
          });

          $.ajax(config.apiURL + config.apiPath + '/jobs-by-qos', options)
            .success(function (jobsByQos) {
              console.log(jobsByQos);
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
