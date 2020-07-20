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
  'ajax-utils',
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
  'different-helpers'
], function($, Handlebars, template, modalTemplate, tableJobsTemplate, tokenUtils, ajaxUtils, tablesorterUtils, flotUtils, tagsinputUtils) {
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);
  tableJobsTemplate = Handlebars.compile(tableJobsTemplate);

  return function(config, filter) {
    var self = this;

    this.interval = null;
    this.tablesorterOptions = {};
    this.tagsinputOptions = [];
    this.onModal = null;
    this.initialLoad = true;
    this.scrollTop = 0;

    function filteredJobs(jobs, result) {
      var context = {
        count: Object.keys(jobs).length,
        jobs: jobs
      };
      if (config.JOBS_XTRA_COL){
        context["cluster"]    = config.cluster.name;
        context["columnname"] = config.JOBS_XTRA_COL.NAME;
        context["condition"]  = config.JOBS_XTRA_COL.CONDITION;
      }

      context.jobs = result;

      $('#table-jobs').html(tableJobsTemplate(context));
      $('.tt-input').css('width', '100%');

      $('tr[id^="tr-job-"]').on('click', function(e) {
        var jobId = $(e.target).parent('tr').attr('id').split('-')[2];

        e.preventDefault();
        $(document).trigger('modal-job', { jobId: jobId });
      });

      $('td[data-partition$="(partition)"], td[data-qos$="(qos)"], td[data-wckey$="(wckey)"]').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        $('input.typeahead').tagsinput('add', $(e.target).attr('data-qos') || $(e.target).attr('data-partition') || $(e.target).attr('data-wckey'));
      });
    }

    function filterTableJobs(jobs) {
      if (self.tagsinputOptions.length > 0) {
        tagsinputUtils.filterJobs(jobs, self.tagsinputOptions, config, filteredJobs);
      } else {
        $('#total-cpus').text('');
        filteredJobs(jobs, jobs);
      }
    }

    function closeModal() {
      $('#modal-job').remove();
      $('.modal-backdrop').remove();
      self.onModal = null;
    }

    function toggleModal(jobId) {
      closeModal();
      self.onModal = jobId;

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/job/' + jobId, ajaxUtils.getAjaxOptions(config.cluster))
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

    this.saveUI = function () {
      self.scrollTop = $(window).scrollTop();
    }

    this.loadUI = function () {
      $(window).scrollTop(self.scrollTop);
    }

    this.init = function() {
      var self = this;

      //Add user-defined sorter
      $.tablesorter.addParser(tablesorterUtils.initParser());

      if(config.JOBS_XTRA_COL){
        Handlebars.registerPartial(
          'xtracol',
          config.JOBS_XTRA_COL.CONTENT.replace('{{cluster}}', '{{parent.cluster}}')
                                      .replace('{{jobId}}', '{{@key}}'));
      };

      $(document).on('modal-job', function(e, options) {
        e.stopPropagation();

        toggleModal(options.jobId);
      });

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', ajaxUtils.getAjaxOptions(config.cluster))
        .success(function(jobs) {
          var context, plotParams, index, dataJobsState, job, qos, part,
            dataAllocatedCores,
            labels = [],
            labelsPartitions = [],
            labelsQOS = [],
            labelsUsername = [],
            labelsStates = [],
            labelsReservations = [],
            labelsCpus = [],
            QOSStats = {},
            partStats = {},
            dataQOSCores = [],
            dataPartCores = [],
            maxLegendHeight = 0;

          if (Object.keys(jobs).length === 0) {
            $('#main').append(template({hasJobs: false}));
            $(document).trigger('pageLoaded');
            return;
          }

          context = {
            tagsinputOptions: self.tagsinputOptions.toString(),
            hasJobs: Object.keys(jobs).length !== 0
          };
          var demicanvas = ($('#main').innerWidth()-50-15*8)/4/2;
          plotParams = {
            series: {
              pie: {
                show: true,
                offset: {
                  left: Math.floor(-1*Math.min(demicanvas-65, demicanvas/2))+1
                }
              }
            }
          };

          $('#main').append(template(context));
          $(document).trigger('pageLoaded');

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
              labelsCpus = labelsCpus.concat(Object.keys(jobs[index].cpus_allocated));
            }
          }

          for (index in labelsPartitions) {
            if (labelsPartitions.hasOwnProperty(index)) {
              labelsPartitions[index] += ' (partition)';
            }
          }

          for (index in labelsQOS) {
            if (labelsQOS.hasOwnProperty(index)) {
              labelsQOS[index] += ' (qos)';
            }
          }

          for (index in labelsUsername) {
            if (labelsUsername.hasOwnProperty(index)) {
              labelsUsername[index] += ' (user)';
            }
          }

          for (index in labelsStates) {
            if (labelsStates.hasOwnProperty(index)) {
              labelsStates[index] += ' (state)';
            }
          }

          for (index in labelsReservations) {
            if (labelsReservations.hasOwnProperty(index)) {
              labelsReservations[index] += ' (reservation)';
            }
          }

          for (index in labelsCpus) {
            if (labelsCpus.hasOwnProperty(index)) {
              labelsCpus[index] += ' (cpu)';
            }
          }

          labels = labelsPartitions
            .concat(labelsQOS)
            .concat(labelsUsername)
            .concat(labelsStates)
            .concat(labelsReservations)
            .concat(labelsCpus);

          $('.typeahead').tagsinput({
            allowDuplicates: false,
            freeInput: false,
            delimiter: ';',
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

          dataJobsState = [
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
            }
          ];

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

          dataAllocatedCores = [
            {
              label: 'allocated',
              data: 0
            }, {
              label: 'idle',
              data: 0
            }
          ];

          // compute stats for pie charts
          for (index in jobs) {
            if (jobs.hasOwnProperty(index)) {
              job = jobs[index];

              // Only jobs in RUNNING, COMPLETING (in epilog) and CONFIGURING
              // (booting allocated nodes) states must be considered in stats.
              // Jobs in other states do not really have allocated resources
              // and they can be safely ignored here.

              if (job.hasOwnProperty('job_state') &&
                  job.hasOwnProperty('qos') &&
                  job.hasOwnProperty('partition') &&
                  (job.job_state === 'RUNNING' ||
                   job.job_state === 'COMPLETING' ||
                   job.job_state === 'CONFIGURING')) {
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

          for (qos in QOSStats) {
            if (QOSStats.hasOwnProperty(qos)) {
              dataQOSCores.push({ label: qos, data: QOSStats[qos].cores });
            }
          }

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
          $('.legend>div').each(function() {
            maxLegendHeight = Math.max(maxLegendHeight, $(this).height());
          });
          $('.plots').css({ 'min-height': maxLegendHeight + 'px' });

          self.loadUI();
        });
    };

    this.refresh = function() {
      this.interval = setInterval(function() {
        self.saveUI();
        self.tablesorterOptions = tablesorterUtils.findTablesorterOptions('.tablesorter');
        self.tagsinputOptions = tagsinputUtils.getTagsinputOptions('.typeahead');
        self.destroy(false);
        self.init();
      }, config.REFRESH);
    };

    this.stopRefresh = function() {
      clearInterval(this.interval);
    }

    this.destroy = function(destroyInterval) {
      if (this.interval && destroyInterval) {
        clearInterval(this.interval);
        $('#modal-job').remove();
        $('.modal-backdrop').remove();
      }
      $(document).off('modal-job');
      $('tr[id^="tr-job-"]').off('click');
      $('td[data-partition$="(partition)"], td[data-qos$="(qos)"], td[data-wckey$="(wckey)"]').off('click');
      $('#apply-tags').off('click');
      $('#jobs').remove();
    };

    return this;
  };
});
