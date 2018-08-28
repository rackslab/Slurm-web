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
  'async',
  'handlebars',
  'text!../../js/modules/jobs-map/jobs-map.hbs',
  'text!../../js/modules/jobs-map/modal-core.hbs',
  'text!../../js/modules/jobs-map/modal-node.hbs',
  'token-utils',
  'ajax-utils',
  '2d-draw',
  '2d-legend-draw',
  'jobs-utils'
], function($, async, Handlebars, template, modalCoreTemplate, modalNodeTemplate, tokenUtils, ajaxUtils, D2Draw, d2LegendDraw, jobs) {
  var draw = new D2Draw();

  template = Handlebars.compile(template);
  modalCoreTemplate = Handlebars.compile(modalCoreTemplate);
  modalNodeTemplate = Handlebars.compile(modalNodeTemplate);

  return function(config) {
    this.slurmNodes = null;
    this.interval = null;
    this.config = draw.getConfig();
    this.scrollTop = 0;

    function closeModalCore(e) {
      e.stopPropagation();

      $('#modal-core').remove();
    }

    function closeModalNode(e) {
      e.stopPropagation();

      $('#modal-node').remove();
    }

    function toggleModalCore(jobId) {

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/job/' + jobId, ajaxUtils.getAjaxOptions(config.cluster))
        .success(function(job) {
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

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs-by-node/' + nodeId, ajaxUtils.getAjaxOptions(config.cluster))
        .success(function(jobs) {
          var context;

          // expand the first job's informations
          if (Object.keys(jobs).length) {
            jobs[Object.keys(jobs)[0]].expanded = 'in';
          }

          context = {
            count: Object.keys(jobs).length,
            nodeId: nodeId,
            jobs: jobs
          };

          $('body').append(modalNodeTemplate(context));
          $('#modal-node').on('hidden.bs.modal', closeModalNode);
          $('#modal-node').modal('show');
        });
    }

    $(document).on('modal-core', function(e, options) {
      e.stopPropagation();

      toggleModalCore(options.jobId);
    });

    $(document).on('modal-node', function(e, options) {
      e.stopPropagation();

      toggleModalNode(options.nodeId);
    });

    this.saveUI = function () {
      self.scrollTop = $(window).scrollTop();
    }

    this.loadUI = function () {
      $(window).scrollTop(self.scrollTop);
    }

    this.init = function() {
      var self = this,
        allocatedCPUs = null;

      var options = ajaxUtils.getAjaxOptions(config.cluster);
      async.parallel({
        jobs: function(callback) {

          $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', options)
            .success(function(data) {
              callback(null, data);
            })
            .error(function() {
              callback(true, null);
            });
        },
        nodes: function(callback) {

          $.ajax(config.cluster.api.url + config.cluster.api.path + '/nodes', options)
            .success(function(data) {
              callback(null, data);
            })
            .error(function() {
              callback(true, null);
            });
        },
        racks: function(callback) {

          $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', options)
            .success(function(data) {
              callback(null, data);
            })
            .error(function() {
              callback(true, null);
            });
        }
      }, function(err, result) {
        var i, racks, rack, resultRacks, context;

        if (err) {
          return;
        }

        self.slurmNodes = result.nodes;
        allocatedCPUs = jobs.buildAllocatedCPUs(result.jobs);

        racks = result.racks.racks;
        if (racks instanceof Array) {
          resultRacks = {};

          for (i in racks) {
            if (racks.hasOwnProperty(i)) {
              for (rack in racks[i]) {
                if (racks[i].hasOwnProperty(rack)) {
                  resultRacks[rack] = racks[i][rack];
                }
              }
            }
          }
          racks = resultRacks;
        }

        context = {
          config: self.config,
          racks: racks
        };

        $('#main').append(template(context));
        $(document).trigger('pageLoaded');

        $('canvas[id^="cv_rackmap_"]').parent('.canvas-container').css('width', self.config.CANVASWIDTH);
        $.each(racks, function(idRack, rack) {
          $('#cv_rackmap_' + idRack).on('click', function(e) {
            var offset = $(this).offset();

            e.stopPropagation();
            $(document).trigger('canvas-click', { rack: idRack, x: e.pageX - offset.left, y: e.pageY - offset.top });
          });

          $('#cv_rackmap_' + idRack).on('mousemove', function(e) {
            var offset = $(this).offset();

            e.stopPropagation();
            $(document).trigger('canvas-mousemove', { rack: idRack, x: e.pageX - offset.left, y: e.pageY - offset.top });
          });

          draw.drawRack(rack);
          $.each(rack.nodes, function(idRacknode, rackNode) {
            draw.drawNodeCores(rack, rackNode, self.slurmNodes[rackNode.name], allocatedCPUs[rackNode.name]);
          });
        });

        d2LegendDraw.drawLegend('jobs-map');

        self.loadUI();
      });
    };

    this.refresh = function() {
      var self = this;

      this.interval = setInterval(function() {
        self.saveUI();
        $('#jobsmap').remove();
        self.init();
      }, config.REFRESH);
    };

    this.stopRefresh = function(){
      clearInterval(this.interval);
    }

    this.destroy = function() {
      if (this.interval) {
        clearInterval(this.interval);
      }

      draw.clearNodesHoverIntersections();

      $('#modal-core').off('hidden.bs.modal');
      $('#modal-core').remove();
      $('#modal-node').off('hidden.bs.modal');
      $('#modal-node').remove();
      $('#jobsmap').remove();
      $(document).off('modal-core');
      $(document).off('modal-node');
      $('canvas[id^="cv_rackmap_"]').off('click');
      $('canvas[id^="cv_rackmap_"]').off('mousemove');
    };

    return this;
  };
});
