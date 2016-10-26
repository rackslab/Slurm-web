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
  'handlebars',
  'text!../../js/modules/gantt/gantt.hbs',
  'text!../../js/modules/gantt/gantt-nodes.hbs',
  'text!../../js/modules/gantt/gantt-qos.hbs',
  'text!../../js/modules/jobs/modal-job.hbs',
  'token-utils',
  'jobs-utils',
  'ajax-utils'
], function($, Handlebars, template, nodesTemplate, qosTemplate, modalTemplate, tokenUtils, jobs, ajaxUtils) {
  var jobStateColors = {
    'PENDING': 'mediumseagreen',
    'RUNNING': 'royalblue',
    'COMPLETED': 'khaki'
  };

  template = Handlebars.compile(template);
  nodesTemplate = Handlebars.compile(nodesTemplate);
  qosTemplate = Handlebars.compile(qosTemplate);
  modalTemplate = Handlebars.compile(modalTemplate);

  function computeTimesForJobs(jobsBySt) {
    var stId, jobId, i,
      times = [],
      currentTime = Date.now() / 1000 | 0, // seconds
      startTime = currentTime - 3600, // seconds
      endTime = currentTime + 3600, // seconds
      timeScale = 1800, // seconds
      timeRange = 0,
      currentPosition = 0;

    for (stId in jobsBySt) {
      for (jobId in jobsBySt[stId]) {
        // ignore job that are not yet started for the computation
        if (jobsBySt[stId][jobId].start_time > 0) {
          startTime = Math.min(startTime, jobsBySt[stId][jobId].start_time);
          endTime = Math.max(endTime, jobsBySt[stId][jobId].end_time);
        }
      }
    }

    timeRange = endTime - startTime; // seconds
    currentPosition = (currentTime - startTime) / timeRange * 100; // percents

    for (i = 0; i * timeScale < Math.max(currentTime - startTime, endTime - currentTime); i++) {
      if (i) {
        times.push({
          value: '-' + i * timeScale / 3600 + 'h',
          position: currentPosition - i * timeScale / timeRange * 100 // percents
        });
      }

      times.push({
        value: i * timeScale / 3600 + 'h',
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

  function computeScaleFactor(range) {
    var scale,
      scales = {
        '150000': 0.05,
        '75000': 0.1,
        '50000': 0.15,
        '15000': 0.2,
        '10000': 0.25,
        '7500': 0.3,
        '5000': 0.4
      };

    for (scale in scales) {
      if (range < scale) {
        return scales[scale];
      }
    }

    return 0.025;
  }

  function computeJobsForNodes(jobsByNodes) {
    var nodeId, jobId, job,
      jobs = [],
      time = computeTimesForJobs(jobsByNodes),
      positionY = 0,
      previousJobId = null,
      scaleFactor = computeScaleFactor(time.timeRange),
      lineHeight = 20;

    for (nodeId in jobsByNodes) {
      for (jobId in jobsByNodes[nodeId]) {
        if (previousJobId && jobId === previousJobId) {
          job = jobs[jobs.length - 1];

          job.height += lineHeight / Object.keys(jobsByNodes[nodeId]).length;
        } else {
          job = jobsByNodes[nodeId][jobId];

          job.id = jobId;
          // set height for job's line (height's unit in pixels)
          job.height = lineHeight / Object.keys(jobsByNodes[nodeId]).length;
          job.positionY = (jobs.length ? jobs[jobs.length - 1].height + jobs[jobs.length - 1].positionY : 0) + positionY;
          // set width for job's line (width's unit in percents)
          job.width = ((job.end_time || job.start_time + job.time_limit * 60) - job.start_time) / time.timeRange * 100;
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

  function computeJobsForQos(jobsByQos) {
    var qosId, jobId, job,
      jobs = [],
      qos = [],
      time = computeTimesForJobs(jobsByQos),
      positionY = 0,
      scaleFactor = computeScaleFactor(time.timeRange),
      lineHeight = 20;

    for (qosId in jobsByQos) {
      qos.push({
        id: qosId,
        height: Math.max(1, Object.keys(jobsByQos[qosId]).length) * lineHeight
      });

      for (jobId in jobsByQos[qosId]) {
        job = jobsByQos[qosId][jobId];

        job.id = jobId;

        // set height for job's line (height's unit in pixels)
        job.height = lineHeight;
        job.positionY = positionY;
        positionY += lineHeight;

        /* eslint-disable camelcase */
        // if end_time < start_time OR end_time = 0, set to start_time + time_limit
        if (job.end_time < job.start_time || !job.end_time) {
          job.end_time = job.start_time + job.time_limit * 60;
        }

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
    var jobId, ganttHeight;

    // resent event listeners
    $('.job').off('click');
    $('#jobs-chart').off('scroll');

    // bind modal-job
    $('.job').on('click', function(e) {
      e.preventDefault();
      jobId = $(e.target).data('id');
      $(document).trigger('modal-job', { jobId: jobId, options: options });
    });

    // sync jobs-chart with axis of times
    $('#jobs-chart').on('scroll', function(e) {
      $('#time').scrollLeft($(this).scrollLeft());
      $('#nodes-list, #qos-list').scrollTop($(this).scrollTop());
    });
    // scroll up to the current time
    $('#jobs-chart').scrollLeft(jobsDatas.currentPosition * jobsDatas.width / 100 - $('#jobs-chart').width() / 2);

    // set height of the view
    ganttHeight = $(window).height() -
      (
        $('#navbar').outerHeight() +
        parseInt($('#main').css('padding-top').slice(0, 2), 10) +
        $('#gantt .page-header').outerHeight() +
        parseInt($('#gantt .page-header').css('margin-bottom').slice(0, 2), 10) +
        $('#time').outerHeight() +
        parseInt($('#main').css('padding-bottom').slice(0, 2), 10)
      );

    $('#gantt .content').height(ganttHeight);
    // set width of abscissa
    $('#time').width($('#jobs-chart').width());
  }

  function showJobsByNodes(options, config) {
    $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs-by-nodes', options)
      .success(function(jobsByNodes) {
        var context = {
          jobs: computeJobsForNodes(jobsByNodes)
        };

        $('#nodes').append(nodesTemplate(context));

        bindUtils(context.jobs, options);
      });
  }

  function showJobsByQos(options, config) {
    $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs-by-qos', options)
      .success(function(jobsByQos) {
        var context = {
          jobs: computeJobsForQos(jobsByQos)
        };

        $('#qos').append(qosTemplate(context));

        bindUtils(context.jobs, options);
      });
  }

  function closeModal(e) {
    e.stopPropagation();

    $('#modal-job').remove();
  }

  function toggleModal(jobId, options, config) {
    $.ajax(config.cluster.api.url + config.cluster.api.path + '/job/' + jobId, options)
      .success(function(job) {
        var context = {
          job: job
        };

        job.id = jobId;
        $('body').append(modalTemplate(context));
        $('#modal-job').on('hidden.bs.modal', closeModal);
        $('#modal-job').modal('show');
      });
  }

  return function(config) {
    this.init = function() {
      var options = ajaxUtils.getAjaxOptions(config.cluster);

      $('#main').append(template());
      $(document).trigger('pageLoaded');

      // bind navbar
      $('#tabs a').click(function(e) {
        e.preventDefault();
        $(this).tab('show');
      });
      // on show 'nodes'
      $('#tabs a[href="#nodes"]').on('show.bs.tab', function(e) {
        $('.tab-pane').empty();
        $('.job').off('click');
        showJobsByNodes(options, config);
      });
      // on show 'qos'
      $('#tabs a[href="#qos"]').on('show.bs.tab', function(e) {
        $('.tab-pane').empty();
        $('.job').off('click');
        showJobsByQos(options, config);
      });
      // init navbar
      $('#tabs a[href="#nodes"]').tab('show');

      $(document).on('modal-job', function(e, options) {
        e.stopPropagation();
        toggleModal(options.jobId, options.options, config);
      });
    };

    this.destroy = function() {
      $('.job').off('click');
      $('#modal-job').off('hidden.bs.modal');
      $('#gantt').remove();
      $('#modal-job').remove();
      $(document).off('modal-job');
    };

    return this;
  };
});
