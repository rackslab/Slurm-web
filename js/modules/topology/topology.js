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
  'text!../../js/modules/topology/topology.hbs',
  'topology-utils',
  'text!../../js/modules/jobs-map/modal-node.hbs',
  'token-utils'
], function ($, Handlebars, template, Topology, modalTemplate, token) {
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);

  return function(config) {

    function closeModal(e) {
      e.stopPropagation();

      $('#modal-node').remove();
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

          $('body').append(modalTemplate(context));
          $('#modal-node').on('hidden.bs.modal', closeModal);
          $('#modal-node').modal('show');
        });
    }

    $(document).on('modal-node', function (e, options) {
      e.stopPropagation();

      toggleModalNode(options.nodeId);
    });

    function toggleModalSwitch(switchId, nodeIds) {
      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster),
          nodes: nodeIds
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs-by-node-ids', options)
        .success(function (jobs) {
          // expand the first job's informations
          if (Object.keys(jobs).length) {
            jobs[Object.keys(jobs)[0]].expanded = 'in';
          }

          var context = {
            count: Object.keys(jobs).length,
            switchId: switchId,
            jobs: jobs
          };

          $('body').append(modalTemplate(context));
          $('#modal-node').on('hidden.bs.modal', closeModal);
          $('#modal-node').modal('show');
        });
    }

    $(document).on('modal-switch', function (e, options) {
      e.stopPropagation();

      toggleModalSwitch(options.switchId, options.nodeIds);
    });


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
          token: token.getToken(config.cluster)
        }),
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/topology', options)
        .success(function (topologyDatas) {
          var context = {
            noData: !Object.keys(topologyDatas).length,
            error: topologyDatas.error
          };

          $('#main').append(template(context));

          if (topologyDatas.error) {
            return;
          }

          var topology = new Topology(topologyDatas);

          $('#main .wrapper').append(topology.graph.html);

          $('#topology .wrapper').height($(window).height() - (
            $('#navbar').outerHeight()  + parseInt($('#main').css('padding-top').slice(0,2)) + $('#topology .page-header').outerHeight() + parseInt($('#topology .page-header').css('margin-bottom').slice(0,2)) + parseInt($('#main').css('padding-bottom').slice(0,2))
          ));
          $('#topology .graph').height($('#topology .wrapper').height() - 25);
          $('#topology .wrapper').scrollLeft(($('#topology .graph').width() - $('#topology .wrapper').width()) / 2);

          // bind modal-node
          $('.node').on('click', function(e) {
            e.stopPropagation();
            $(document).trigger('modal-node', { nodeId: $(this).data('id') });
          });

          // bind modal-switch
          $('.switch').on('click', 'rect, text', function(e) {
            var id = $(this).parent('.switch').data('id');
            e.stopPropagation();
            $(document).trigger('modal-switch', {
              switchId: id,
              nodeIds: Object.keys(topology.rawDatas[id].nodes)
            });
          });
        });
    }

    this.destroy = function () {
      $('.node').off('click');
      $('#modal-node').off('hidden.bs.modal');
      $('#modal-node').remove();
      $('#topology').remove();
      $(document).off('modal-node');
    }

    return this;
  };
});
