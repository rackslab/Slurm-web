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
], function ($) {
  return function () {
    var self = this;
    this.coresIntersections = {};
    this.nodesIntersections = {};

    $(document).on('canvas-click', function (e, options) {
      e.stopPropagation();

      var X = options.x;
      var Y = options.y;

      var index;
      var core;
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

      var node;
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

    this.addCoreIntersections = function (infos, XMIN, XMAX, YMIN, YMAX) {
      if (!this.coresIntersections.hasOwnProperty(infos.rack)) {
        this.coresIntersections[infos.rack] = {};
      }

      this.coresIntersections[infos.rack][infos.node + '-' + infos.core] =  {
        job: infos.job,
        XMIN: XMIN,
        XMAX: XMAX,
        YMIN: YMIN,
        YMAX: YMAX
      };
    };

    this.addNodeIntersections = function (infos, XMIN, XMAX, YMIN, YMAX) {
      if (!this.nodesIntersections.hasOwnProperty(infos.rack)) {
        this.nodesIntersections[infos.rack] = {};
      }

      this.nodesIntersections[infos.rack][infos.node] =  {
        XMIN: XMIN,
        XMAX: XMAX,
        YMIN: YMIN,
        YMAX: YMAX
      };
    };

    return this;
  };
});
