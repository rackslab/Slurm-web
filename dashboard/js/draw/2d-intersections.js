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
  'jquery'
], function($) {
  return function() {
    var self = this;

    this.coresIntersections = {};
    this.nodesIntersections = {};
    this.nodesHoverIntersections = {};

    $(document).on('canvas-click', function(e, options) {
      var index, core, node,
        X = options.x,
        Y = options.y;

      e.stopPropagation();

      for (index in self.coresIntersections[options.rack]) {
        if (self.coresIntersections[options.rack].hasOwnProperty(index)) {
          core = self.coresIntersections[options.rack][index];
          if (X >= core.XMIN && X <= core.XMAX &&
              Y >= core.YMIN && Y <= core.YMAX) {
            $(document).trigger('modal-core', { jobId: core.job });
            return;
          }
        }
      }

      for (index in self.nodesIntersections[options.rack]) {
        if (self.nodesIntersections[options.rack].hasOwnProperty(index)) {
          node = self.nodesIntersections[options.rack][index];
          if (X >= node.XMIN && X <= node.XMAX &&
              Y >= node.YMIN && Y <= node.YMAX) {
            $(document).trigger('modal-node', { nodeId: index });
            return;
          }
        }
      }
    });

    $(document).on('canvas-mousemove', function(e, options) {
      var index, node,
        X = options.x,
        Y = options.y;

      e.stopPropagation();
      $('.canvas-tooltip').hide();

      for (index in self.nodesHoverIntersections[options.rack]) {
        if (self.nodesHoverIntersections[options.rack].hasOwnProperty(index)) {
          node = self.nodesHoverIntersections[options.rack][index];
          if (X >= node.XMIN && X <= node.XMAX &&
              Y >= node.YMIN && Y <= node.YMAX) {
            var tooltipText = node.reason ? index + ' - ' + node.reason : index;  //show reason if there is one.
            $('#cv_rackmap_' + options.rack)
              .siblings('.canvas-tooltip')
              .html(tooltipText)
              .css('top', node.YMAX)
              .css('left', node.XMIN)
              .show();
          }
        }
      }
    });

    this.addNodeHoverIntersections = function(infos, node) {
      if (!this.nodesHoverIntersections.hasOwnProperty(infos.rackName)) {
        this.nodesHoverIntersections[infos.rackName] = {};
      }

      this.nodesHoverIntersections[infos.rackName][infos.nodeName] = {
        XMIN: node.x,
        XMAX: node.x + node.width,
        YMIN: node.y,
        YMAX: node.y + node.height,
        reason: infos.reason
      };
    };

    this.addCoreIntersections = function(infos, core) {
      if (!this.coresIntersections.hasOwnProperty(infos.rack)) {
        this.coresIntersections[infos.rack] = {};
      }

      this.coresIntersections[infos.rack][infos.node + '-' + infos.core] = {
        job: infos.job,
        XMIN: core.x,
        XMAX: core.x + core.size,
        YMIN: core.y,
        YMAX: core.y + core.size
      };
    };

    this.addNodeIntersections = function(infos, node) {
      if (!this.nodesIntersections.hasOwnProperty(infos.rack)) {
        this.nodesIntersections[infos.rack] = {};
      }

      this.nodesIntersections[infos.rack][infos.node] = {
        XMIN: node.x,
        XMAX: node.x + node.width,
        YMIN: node.y,
        YMAX: node.y + node.height
      };
    };

    return this;
  };
});
