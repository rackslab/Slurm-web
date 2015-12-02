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
  'text!../../js/modules/jobs-map/jobs-map.hbs',
  'text!../../js/modules/jobs-map/modal-core.hbs',
  'text!../../js/modules/jobs-map/modal-node.hbs',
  'token-utils',
  '2d-draw',
  '2d-legend-draw',
  'nodes-utils',
  'jobs-utils'
], function ($, Handlebars, template, modalCoreTemplate, modalNodeTemplate, token, D2Draw, d2LegendDraw, nodes, jobs) {
  template = Handlebars.compile(template);
  modalCoreTemplate = Handlebars.compile(modalCoreTemplate);
  modalNodeTemplate = Handlebars.compile(modalNodeTemplate);
  var draw = new D2Draw();

  return function (config) {
    this.slurmNodes = null;
    this.interval = null;
    this.config = draw.getConfig();

    function closeModalCore(e) {
      e.stopPropagation();

      $('#modal-core').remove();
    }

    function closeModalNode(e) {
      e.stopPropagation();

      $('#modal-node').remove();
    }

    function toggleModalCore(jobId) {
      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/job/' + jobId, options)
        .success(function (job) {
          var context = {
            jobId: jobId,
            job: job
          };

          $('body').append(modalCoreTemplate(context));
          $('#modal-core').on('hidden.bs.modal', closeModalCore);
          $('#modal-core').modal('show');
        });
    }

    function toggleModalNode(nodeId) {
      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs-by-node/' + nodeId, options)
        .success(function (jobs) {
          // expand the first job's informations
          if (Object.keys(jobs).length) {
            jobs[Object.keys(jobs)[0]].expanded = 'in';
          }

          var context = {
            count: Object.keys(jobs).length,
            nodeId: nodeId,
            jobs: jobs
          };

          $('body').append(modalNodeTemplate(context));
          $('#modal-node').on('hidden.bs.modal', closeModalNode);
          $('#modal-node').modal('show');
        });
    }

    $(document).on('modal-core', function (e, options) {
      e.stopPropagation();

      toggleModalCore(options.jobId);
    });

    $(document).on('modal-node', function (e, options) {
      e.stopPropagation();

      toggleModalNode(options.nodeId);
    });

    this.init = function () {
      var self = this;
      var allocatedCPUs = null;
      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      this.slurmNodes = nodes.getNodes(config);
      allocatedCPUs = jobs.buildAllocatedCPUs(jobs.getJobs(config));

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', options)
        .success(function (data) {
          var racks = data.racks;
          if (racks instanceof Array) {
            var result = {};
            var i;
            var rack;
            for (i in racks) {
              if (racks.hasOwnProperty(i)) {
                for (rack in racks[i]) {
                  if (racks[i].hasOwnProperty(rack)) {
                    result[rack] = racks[i][rack];
                  }
                }
              }
            }
            racks = result;
          }

          var context = {
            config: self.config,
            racks: racks
          };

          $('#main').append(template(context));
          $.each(racks, function (idRack, rack) {
            $('#cv_rackmap_' + idRack).on('click', function (e) {
              e.stopPropagation();
              var offset = $(this).offset();

              $(document).trigger('canvas-click', { rack: idRack, x: (e.pageX - offset.left), y: (e.pageY - offset.top) });
            });

            draw.drawRack(rack);
            $.each(rack.nodes, function (idRacknode, rackNode) {
              draw.drawNodeCores(rack, rackNode, self.slurmNodes[rackNode.name], allocatedCPUs[rackNode.name]);
            });
          });

          d2LegendDraw.drawLegend('jobs-map');
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#jobsmap').remove();
        self.init();
      }, config.REFRESH);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $("canvas[id^='cv_rackmap_']").off('click');
      $('#modal-core').off('hidden.bs.modal');
      $('#modal-core').remove();
      $('#modal-node').off('hidden.bs.modal');
      $('#modal-node').remove();
      $('#jobsmap').remove();
      $(document).off('modal-core');
      $(document).off('modal-node');
    };

    return this;
  };
});
