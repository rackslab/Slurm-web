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
  'text!../../js/modules/jobs/jobs.hbs',
  'text!../../js/modules/jobs/modal-job.hbs',
  'text!../../js/modules/jobs/table-jobs.hbs',
  'token-utils',
  'tablesorter-utils',
  'flot-utils',
  'tagsinput-utils',
  'jobs-utils',
  'jquery-tablesorter',
  'jquery-flot',
  'jquery-flot-pie',
  'bootstrap',
  'bootstrap-tagsinput',
  'jobs-helpers',
  'boolean-helpers',
  'date-helpers',
  'different-helpers',
], function ($, Handlebars, template, modalTemplate, tableJobsTemplate, tokenUtils, tablesorterUtils, flotUtils, tagsinputUtils) {
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);
  tableJobsTemplate = Handlebars.compile(tableJobsTemplate);

  return function (config, filter) {
    var self = this;
    this.interval = null;
    this.tablesorterOptions = {};
    this.tagsinputOptions = [];
    this.onModal = null;
    this.initialLoad = true;

    function filterTableJobs(jobs) {
      var context = {
        count: Object.keys(jobs).length,
        jobs: jobs
      };

      context.jobs = tagsinputUtils.filterJobs(jobs, self.tagsinputOptions);
      $('#table-jobs').html(tableJobsTemplate(context));
      $('.tt-input').css('width', '100%');

      $("tr[id^='tr-job-']").on('click', function (e) {
        e.preventDefault();

        var jobId = $(e.target).parent('tr').attr('id').split('-')[2];
        $(document).trigger('modal-job', { jobId: jobId });
      });

      $("td[data-partition$='(partition)'], td[data-qos$='(qos)']").on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $('input.typeahead').tagsinput('add', $(e.target).attr('data-qos') || $(e.target).attr('data-partition'));
      });
    }

    function closeModal() {
      $('#modal-job').remove();
      $('.modal-backdrop').remove();
      self.onModal = null;
    }

    function toggleModal(jobId) {
      closeModal();
      self.onModal = jobId;

      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: tokenUtils.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/job/' + jobId, options)
        .success(function (job) {
          job.id = jobId;
          var context = {
            job: job
          };

          $('body').append(modalTemplate(context));
          $('#modal-job').on('hidden.bs.modal', closeModal);
          $('#modal-job').modal('show');
        });
    }

    this.init = function () {
      var self = this;
      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: tokenUtils.getToken(config.cluster)
        })
      };

      $(document).on('modal-job', function (e, options) {
        e.stopPropagation();

        toggleModal(options.jobId);
      });

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', options)
        .success(function (jobs) {
          if (Object.keys(jobs).length === 0) {
            $('#main').append(template());
            return ;
          }

          var context = {
            tagsinputOptions: self.tagsinputOptions.toString()
          };

          var plotParams = {
            series: {
              pie: {
                show: true,
              }
            }
          };

          $('#main').append(template(context));

          if (self.onModal) {
            $(document).trigger('modal-job', { jobId: self.onModal });
          }

          var labels = [];
          var labelsPartitions = [];
          var labelsQOS = [];
          var labelsUsername = [];
          var labelsStates = [];
          var labelsReservations = [];

          var index;
          for (index in jobs) {
            if (jobs.hasOwnProperty(index)) {
              if (labelsPartitions.indexOf(jobs[index].partition) === -1) {
                labelsPartitions.push(jobs[index].partition);
              }
              if (labelsQOS.indexOf(jobs[index].qos) === -1) {
                labelsQOS.push(jobs[index].qos);
              }
              if (labelsUsername.indexOf(jobs[index].username) === -1) {
                labelsUsername.push(jobs[index].username);
              }
              if (labelsStates.indexOf(jobs[index].job_state) === -1) {
                labelsStates.push(jobs[index].job_state);
              }
              if (labelsReservations.indexOf(jobs[index].resv_name) === -1) {
                labelsReservations.push(jobs[index].resv_name);
              }
            }
          }

          for (index in labelsPartitions) {
            if (labelsPartitions.hasOwnProperty(index)) {
              labelsPartitions[index] = labelsPartitions[index] + ' (partition)';
            }
          }

          for (index in labelsQOS) {
            if (labelsQOS.hasOwnProperty(index)) {
              labelsQOS[index] = labelsQOS[index] + ' (qos)';
            }
          }

          for (index in labelsUsername) {
            if (labelsUsername.hasOwnProperty(index)) {
              labelsUsername[index] = labelsUsername[index] + ' (user)';
            }
          }

          for (index in labelsStates) {
            if (labelsStates.hasOwnProperty(index)) {
              labelsStates[index] = labelsStates[index] + ' (state)';
            }
          }

          for (index in labelsReservations) {
            if (labelsReservations.hasOwnProperty(index)) {
              labelsReservations[index] = labelsReservations[index] + ' (reservation)';
            }
          }

          labels = labelsPartitions
            .concat(labelsQOS)
            .concat(labelsUsername)
            .concat(labelsStates)
            .concat(labelsReservations);

          $('.typeahead').tagsinput({
            allowDuplicates: false,
            freeInput: false,
            typeaheadjs: {
              hint: true,
              highlight: true,
              minLength: 1,
              source: tagsinputUtils.jobsSubstringMatcher(labels)
            }
          });

          $('input.typeahead').on('itemAdded itemRemoved', function(event) {
            self.tagsinputOptions = tagsinputUtils.getTagsinputOptions('.typeahead');
            filterTableJobs(jobs);
          });

          if (filter && self.initialLoad) {
            $('.typeahead').tagsinput('add', filter.value + ' (' + filter.type + ')');

            self.initialLoad = false;
          }

          filterTableJobs(jobs);

          tablesorterUtils.eraseEmptyColumn('.tablesorter');
          $('.tablesorter').tablesorter(self.tablesorterOptions);

          var dataJobsState = [
            {
              label: 'Running',
              data: 0
            },
            {
              label: 'Pending',
              data: 0
            },
            {
              label: 'Completed',
              data: 0
            },
          ];

          var index;
          var job;
          for (index in jobs) {
            if (jobs.hasOwnProperty(index)) {
              job = jobs[index];

              if (job.job_state === 'RUNNING') {
                dataJobsState[0].data += 1;
              } else if (job.job_state === 'PENDING') {
                dataJobsState[1].data += 1;
              } else if (job.job_state === 'COMPLETED') {
                dataJobsState[2].data += 1;
              }
            }
          }

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

          dataAllocatedCores[1].data += config.cluster.infos.cores - dataAllocatedCores[0].data;

          var dataQOSCores = [];

          var QOS;
          for (QOS in QOSStats) {
            if (QOSStats.hasOwnProperty(QOS)) {
              dataQOSCores.push({ label: QOS, data: QOSStats[QOS].cores });
            }
          }

          var dataPartCores = [];

          var part;
          for (part in partStats) {
            if (partStats.hasOwnProperty(part)) {
              dataPartCores.push({ label: part, data: partStats[part].cores });
            }
          }

          dataAllocatedCores = flotUtils.addPercentInLegend(dataAllocatedCores);
          dataPartCores = flotUtils.addPercentInLegend(dataPartCores);
          dataQOSCores = flotUtils.addPercentInLegend(dataQOSCores);
          dataJobsState = flotUtils.addPercentInLegend(dataJobsState);

          $.plot('#plot-alloc-cores', dataAllocatedCores, plotParams);
          $.plot('#plot-part-cores', dataPartCores, plotParams);
          $.plot('#plot-qos-cores', dataQOSCores, plotParams);
          $.plot('#plot-jobs-states', dataJobsState, plotParams);

          // set min-height for plots area
          var maxLegendHeight = 0;
          $('.legend>div').each(function() {
            maxLegendHeight = Math.max(maxLegendHeight, $(this).height());
          });
          $('.plots').css({'min-height': maxLegendHeight + 'px'})
        });
    };

    this.refresh = function () {
      this.interval = setInterval(function () {
        self.tablesorterOptions = tablesorterUtils.findTablesorterOptions('.tablesorter');
        self.tagsinputOptions = tagsinputUtils.getTagsinputOptions('.typeahead');
        self.destroy(false);
        self.init();
      }, config.REFRESH);
    };

    this.destroy = function (destroyInterval) {
      if (this.interval && destroyInterval) {
        clearInterval(this.interval);
      }

      $('#modal-job').remove();
      $('.modal-backdrop').remove();
      $(document).off('modal-job');
      $("tr[id^='tr-job-']").off('click');
      $("td[data-partition$='(partition)'], td[data-qos$='(qos)']").off('click');
      $('#apply-tags').off('click');
      $('#jobs').remove();
    };

    return this;
  };
});
