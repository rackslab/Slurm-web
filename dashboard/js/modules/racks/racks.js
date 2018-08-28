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
  'text!../../js/modules/racks/racks.hbs',
  'token-utils',
  'ajax-utils',
  '2d-draw',
  '2d-legend-draw'
], function($, async, Handlebars, template, tokenUtils, ajaxUtils, D2Draw, d2LegendDraw) {
  var draw = new D2Draw();

  template = Handlebars.compile(template);
  return function(config) {
    this.slurmNodes = null;
    this.interval = null;
    this.config = draw.getConfig();
    this.scrollTop = 0;

    this.saveUI = function () {
      self.scrollTop = $(window).scrollTop();
    }

    this.loadUI = function () {
      $(window).scrollTop(self.scrollTop);
    }

    this.init = function() {
      var self = this;

      async.parallel({
        nodes: function(callback) {

          $.ajax(config.cluster.api.url + config.cluster.api.path + '/nodes', ajaxUtils.getAjaxOptions(config.cluster))
            .success(function(data) {
              callback(null, data);
            })
            .error(function() {
              callback(true, null);
            });
        },
        racks: function(callback) {

          $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', ajaxUtils.getAjaxOptions(config.cluster))
            .success(function(data) {
              callback(null, data);
            })
            .error(function() {
              callback(true, null);
            });
        }
      }, function(err, result) {
        var i, racks, rack, parsed, context;

        if (err) {
          return;
        }
        self.slurmNodes = result.nodes;

        racks = result.racks.racks;
        if (racks instanceof Array) {
          parsed = {};
          for (i in racks) {
            if (racks.hasOwnProperty(i)) {
              for (rack in racks[i]) {
                if (racks[i].hasOwnProperty(rack)) {
                  parsed[rack] = racks[i][rack];
                }
              }
            }
          }
          racks = parsed;
        }

        context = {
          config: self.config,
          racks: racks
        };

        $('#main').append(template(context));
        $(document).trigger('pageLoaded');

        $('canvas[id^="cv_rackmap_"]').parent('.canvas-container').css('width', self.config.CANVASWIDTH);

        $.each(racks, function(idRack, rack) {
          $('#cv_rackmap_' + idRack).on('mousemove', function(e) {
            var offset = $(this).offset();

            e.stopPropagation();
            $(document).trigger('canvas-mousemove', { rack: idRack, x: e.pageX - offset.left, y: e.pageY - offset.top });
          });

          draw.drawRack(rack);
          $.each(rack.nodes, function(idRackNode, rackNode) {
            draw.drawNode(rack, rackNode, self.slurmNodes[rackNode.name]);
          });
        });

        d2LegendDraw.drawLegend('racks');

        self.loadUI();
      });
    };

    this.refresh = function() {
      var self = this;

      this.stopRefresh = function(){
        clearInterval(this.interval);
      }

      this.interval = setInterval(function() {
        self.saveUI();
        $('#racks').remove();
        self.init();
      }, config.REFRESH);
    };

    this.destroy = function() {
      if (this.interval) {
        clearInterval(this.interval);
      }

      draw.clearNodesHoverIntersections();

      $('canvas[id^="cv_rackmap_"]').off('mousemove');
      $('#racks').remove();
    };

    return this;
  };
});
