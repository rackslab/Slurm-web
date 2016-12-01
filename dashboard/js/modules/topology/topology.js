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
  'token-utils',
  'ajax-utils',
  'error-utils',
  'd3'
], function($, Handlebars, template, Topology, modalTemplate, tokenUtils, ajaxUtils, errorUtils, d3) {
  template = Handlebars.compile(template);
  modalTemplate = Handlebars.compile(modalTemplate);

  return function(config) {
    function closeModal(e) {
      e.stopPropagation();
      $('#modal-node').remove();
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

          $('body').append(modalTemplate(context));
          $('#modal-node').on('hidden.bs.modal', closeModal);
          $('#modal-node').modal('show');
        });
    }

    $(document).on('modal-node', function(e, options) {
      e.stopPropagation();
      toggleModalNode(options.nodeId);
    });

    this.init = function() {

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/topology', ajaxUtils.getAjaxOptions(config.cluster))
        .success(function(topologyDatas) {
          var topology, width, height, color, force, svg, links, gnodes, nodes,
            slurmnodes, linknodes, nodesets,
            context = {
              noData: !Object.keys(topologyDatas).length,
              error: topologyDatas.error
            };

          $('#main').append(template(context));
          $(document).trigger('pageLoaded');

          if (topologyDatas.error) {
            errorUtils.setError(topologyDatas.error);
          }

          topology = new Topology(topologyDatas);

          // d3
          width = $('#main .wrapper').width();
          height = $(window).height() - 160;

          color = d3.scale.category20();

          force = d3.layout.force()
            .charge(function(d) {
              return d.group === 1 ? -topology.config.NODECHARGE : -topology.config.SWITCHCHARGE;
            })
            .linkDistance(function(d) {
              return d.target.group === 1 ? topology.config.NODEDISTANCE : topology.config.SWITCHDISTANCE;
            })
            .size([ width, height ]);

          svg = d3.select('#main .wrapper').append('svg')
            .attr('width', width)
            .attr('height', height);

          force
          .nodes(topology.graph.nodes)
          .links(topology.graph.links)
          .start();

          links = svg.selectAll('.link')
              .data(topology.graph.links)
            .enter().append('line')
              .attr('class', function(d) {
                return d.linkClass + ' link';
              })
              .style('stroke', 'grey')
              .style('stroke-width', function(d) {
                return Math.sqrt(d.value);
              })
              .style('visibility', function(d) {
                return d.target.group === 1 ? 'hidden' : 'visible';
              });

          gnodes = svg.selectAll('g.gnode')
              .data(topology.graph.nodes)
            .enter()
              .append('g')
              .classed('gnode', true);

          nodes = gnodes.append('circle')
            .attr('class', function(d) {
              return d.nodeClass + ' node';
            })
            .attr('r', function(d) {
              return d.size;
            })
            .style('fill', function(d) {
              return color(d.group);
            })
            .style('visibility', function(d) {
              return d.group === 1 ? 'hidden' : 'visible';
            })
            .call(force.drag);

          gnodes.filter(function(d) {
            return [ 'switch', 'nodeset' ].indexOf(d.nodeClass) >= 0;
          })
          .append('text')
          .attr('transform', function(d) {
            return 'translate(' + [ -d.name.length * 3.5, -d.size - 5 ] + ')';
          })
          .text(function(d) {
            return d.name;
          });

          nodes.append('title')
          .text(function(d) {
            return d.name;
          });

          force.on('tick', function() {
            links.attr('x1', function(d) {
              return d.source.x;
            })
           .attr('y1', function(d) {
             return d.source.y;
           })
           .attr('x2', function(d) {
             return d.target.x;
           })
           .attr('y2', function(d) {
             return d.target.y;
           });

            gnodes.attr('transform', function(d) {
              return 'translate(' + [ d.x, d.y ] + ')';
            });
          });

          slurmnodes = svg.selectAll('.slurmnode');
          linknodes = svg.selectAll('.link-node');

          nodesets = svg.selectAll('.nodeset')
            .on('mousedown', function(target) {
              target.dragging = false;
            })
            .on('mousemove', function(target) {
              target.dragging = true;
            })
            .on('mouseup', function(target) {
              var displayed = target.displayed;

              if (target.dragging) {
                return false;
              }

              slurmnodes.style('visibility', 'hidden');
              linknodes.style('visibility', 'hidden');
              nodesets.each(function(d) {
                d.displayed = false;
              });

              if (!displayed) {
                nodes.filter(function(d) {
                  return target.nodes.indexOf(d) >= 0;
                }).style('visibility', 'visible');

                links.filter(function(d) {
                  return target.nodes.indexOf(d.target) >= 0;
                }).style('visibility', 'visible');

                target.displayed = true;
              }
            });

          // bind modal-node
          slurmnodes.on('click', function(target) {
            $(document).trigger('modal-node', { nodeId: target.name });
          });
        });
    };

    this.destroy = function() {
      $('.node').off('click');
      $('#modal-node').off('hidden.bs.modal');
      $('#modal-node').remove();
      $('#topology').remove();
      $(document).off('modal-node');
    };

    return this;
  };
});
