define(['jquery', 'handlebars', 'text!../../js/modules/gantt/gantt.hbs', 'text!../../js/modules/gantt/gantt-nodes.hbs', 'text!../../js/modules/gantt/gantt-qos.hbs', 'text!../../js/modules/jobs/modal-job.hbs', 'text!config.json', 'token-utils', 'jobs-utils', 'nodes-utils'], function ($, Handlebars, template, nodesTemplate, qosTemplate, modalTemplate, config, token, jobs, nodes) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  nodesTemplate = Handlebars.compile(nodesTemplate);
  qosTemplate = Handlebars.compile(qosTemplate);
  modalTemplate = Handlebars.compile(modalTemplate);

  var jobStateColors = {
    'PENDING': 'mediumseagreen',
    'RUNNING': 'royalblue',
    'COMPLETED': 'khaki'
  };

  function computeTimesForJobs(jobsBySt) {
    var times = [];
    var currentTime = Date.now() / 1000 | 0; // seconds
    var startTime = currentTime - 3600; // seconds
    var endTime = currentTime + 3600; // seconds
    var timeScale = 1800; // seconds

    for (var stId in jobsBySt) {
      for (var jobId in jobsBySt[stId]) {
        startTime = Math.min(startTime, jobsBySt[stId][jobId].start_time);
        endTime = Math.max(endTime, jobsBySt[stId][jobId].end_time);
      }
    }

    var timeRange = (endTime - startTime), // seconds
        currentPosition = (currentTime - startTime) / timeRange * 100; // percents

    for (var i = 0; i * timeScale < Math.max(currentTime - startTime, endTime - currentTime); i++) {
      if (i) {
        times.push({
          value: "-" + (i * timeScale / 3600) + "h",
          position: currentPosition - i * timeScale / timeRange * 100 // percents
        });
      }

      times.push({
        value: (i * timeScale / 3600) + "h",
        position: currentPosition + i * timeScale / timeRange * 100 // percents
      });
    }

    return {
      times: times,
      timeRange: timeRange,
      currentPosition: currentPosition,
      start: startTime
    };
  }

  function computeScaleFactor (range) {
    var scales = {
      "150000": 0.05,
      "75000": 0.1,
      "50000": 0.15,
      "15000": 0.2,
      "10000": 0.25,
      "7500": 0.3,
      "5000": 0.4
    };

    for (var scale in scales) {
      if (range < scale)
        return scales[scale];
    }
    return 0.025;
  }

  function computeJobsForNodes (jobsByNodes) {
    var jobs = [],
        time = computeTimesForJobs(jobsByNodes),
        positionY = 0,
        previousJobId = null,
        scaleFactor = computeScaleFactor(time.timeRange),
        lineHeight = 20;

    for (var nodeId in jobsByNodes) {
      for (var jobId in jobsByNodes[nodeId]) {
        if (previousJobId && jobId === previousJobId) {
          var job = jobs[jobs.length - 1];

          job.height += lineHeight / Object.keys(jobsByNodes[nodeId]).length;
        } else {
          var job = jobsByNodes[nodeId][jobId];

          job.id = jobId;
          // set height for job's line (height's unit in pixels)
          job.height = lineHeight / Object.keys(jobsByNodes[nodeId]).length;
          job.positionY = (jobs.length ? jobs[jobs.length - 1].height + jobs[jobs.length - 1].positionY : 0) + positionY;
          // set width for job's line (width's unit in percents)
          job.width = ((job.end_time || (job.start_time + job.time_limit * 60)) - job.start_time) / time.timeRange * 100;
          job.positionX = (job.start_time - time.start) / time.timeRange * 100;

          job.color = jobStateColors[job.job_state];

          // reset markers
          positionY = 0;
          previousJobId = jobId;

          jobs.push(job);
        }
      }

      if (!Object.keys(jobsByNodes[nodeId]).length) {
        previousJobId = null;
        positionY += lineHeight;
      }
    }

    return {
      jobs: jobs,
      nodes: Object.keys(jobsByNodes),
      times: time.times,
      width: time.timeRange * scaleFactor,
      currentPosition: time.currentPosition,
      height: Object.keys(jobsByNodes).length * lineHeight
    };
  }

  function computeJobsForQos (jobsByQos) {
    var jobs = [],
        qos = [],
        time = computeTimesForJobs(jobsByQos),
        positionY = 0,
        scaleFactor = computeScaleFactor(time.timeRange),
        lineHeight = 20;

    for (var qosId in jobsByQos) {
      qos.push({
        id: qosId,
        height: Math.max(1, Object.keys(jobsByQos[qosId]).length) * lineHeight
      });

      for (var jobId in jobsByQos[qosId]) {
        var job = jobsByQos[qosId][jobId];

        job.id = jobId;

        // set height for job's line (height's unit in pixels)
        job.height = lineHeight;
        job.positionY = (positionY += lineHeight);

        // if end_time < start_time OR end_time = 0, set to start_time + time_limit
        if (job.end_time < job.start_time || !job.end_time)
          job.end_time = job.start_time + job.time_limit * 60;

        // set width for job's line (width's unit in percents)
        job.width = (job.end_time - job.start_time) / time.timeRange * 100;
        job.positionX = (job.start_time - time.start) / time.timeRange * 100;

        job.color = jobStateColors[job.job_state];

        jobs.push(job);
      }

      // increment positionY when the QoS is empty
      if (!Object.keys(jobsByQos[qosId]).length) {
        positionY += lineHeight;
      }
    }

    return {
      jobs:            jobs,
      qos:             qos,
      times:           time.times,
      width:           time.timeRange * scaleFactor,
      currentPosition: time.currentPosition,
      height:          positionY
    };
  }

  function bindUtils(jobsDatas, options) {
    // bind modal-job
    $(".job").on('click', function (e) {
      e.preventDefault();
      var jobId = $(e.target).data('id');
      $(document).trigger('modal-job', { jobId: jobId, options: options });
    });

    // sync jobs-chart with axis of times
    $("#jobs-chart").on('scroll', function (e) {
      $('#time').scrollLeft($(this).scrollLeft());
    });
    // scroll up to the current time
    $("#jobs-chart").scrollLeft(jobsDatas.currentPosition * jobsDatas.width / 100 - $('#jobs-chart').width() / 2);

    // set height of the view
    var ganttHeight = $(window).height() - ($('body>nav').height() + parseInt($('#gantt').css('padding-top').slice(0,2)) + $('#gantt .page-header').height() + parseInt($('#gantt .page-header').css('margin-bottom').slice(0,2)) + 80);
    $('#gantt .content').height(ganttHeight);
    // set width of abscissa
    $('#time').width($('#jobs-chart').width());
  }

  function showJobsByNodes(options) {
    $.ajax(config.apiURL + config.apiPath + '/jobs-by-nodes', options)
      .success(function (jobsByNodes) {
        var jobsDatas = computeJobsForNodes(jobsByNodes);
        var context = {
          jobs: jobsDatas
        }

        $('#nodes').append(nodesTemplate(context));

        bindUtils(jobsDatas, options);
      });
  };

  function showJobsByQos(options) {
    $.ajax(config.apiURL + config.apiPath + '/jobs-by-qos', options)
      .success(function (jobsByQos) {
        console.log(jobsByQos);
        var jobsDatas = computeJobsForQos(jobsByQos);
        var context = {
          jobs: jobsDatas
        }

        $('#qos').append(qosTemplate(context));

        bindUtils(jobsDatas, options);
      });
  };

  function closeModal(e) {
    e.stopPropagation();

    $('#modal-job').remove();
  }

  function toggleModal(jobId, options) {
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
        }),
      };

      $('body').append(template());


      // bind navbar
      $('#tabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
      });
      // on show 'nodes'
      $('#tabs a[href="#nodes"]').on('show.bs.tab', function (e) {
        $('.tab-pane').empty();
        $(".job").off('click');
        $('#modal-job').off('hidden.bs.modal');
        $('#modal-job').remove();
        $(document).off('modal-job');
        showJobsByNodes(options);
      })
      // on show 'qos'
      $('#tabs a[href="#qos"]').on('show.bs.tab', function (e) {
        $('.tab-pane').empty();
        $(".job").off('click');
        $('#modal-job').off('hidden.bs.modal');
        $('#modal-job').remove();
        $(document).off('modal-job');
        showJobsByQos(options);
      })
      // init navbar
      $('#tabs a[href="#nodes"]').tab('show');
      // $('#tabs a[href="#nodes"]').click();

      $(document).on('modal-job', function (e, options) {
        e.stopPropagation();
        toggleModal(options.jobId, options.options);
      });
    }

    this.destroy = function () {
      $(".job").off('click');
      $('#modal-job').off('hidden.bs.modal');
      $('#gantt').parent('.container-fluid').remove();
      $('#modal-job').remove();
      $(document).off('modal-job');
    }

    return this;
  };
});
