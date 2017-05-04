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
  'text!/slurm-web-conf/2d.colors.config.json',
  'text!/slurm-web-conf/3d.colors.config.json'
], function(d2ColorsConfig, d3ColorsConfig) {
  var d2Colors = JSON.parse(d2ColorsConfig),
    d3Colors = JSON.parse(d3ColorsConfig);

  return {
    findJobColor: function(jobId, type) {
      var colors = d2Colors;

      if (type === '3D') {
        colors = d3Colors;
      }

      return colors.JOB[jobId % colors.JOB.length];
    },
    findLedColor: function(node, type) {
      var colors = type === '3D' ? d3Colors : d2Colors,
        stateColor = colors.LED.IDLE,
        nodeColor = colors.LED.UNKNOWN,
        allocatedColor = node.total_cpus === 0
          ? colors.LED.FULLYALLOCATED
          : colors.LED.PARTALLOCATED;

      if (!node || !node.hasOwnProperty('state')) {
        return { node: nodeColor, state: stateColor };
      }

      if (node === null) {
        return { node: nodeColor, state: null };
      }

      switch (node.state) {
      case 'IDLE':
      case 'IDLE*':
      case 'IDLE#':
        stateColor = colors.LED.AVAILABLE;
        nodeColor = colors.LED.IDLE;
        break;
      case 'IDLE+POWER':
        stateColor = colors.LED.AVAILABLE;
        nodeColor = colors.LED.UNAVAILABLE;
        break;
      case 'ALLOCATED':
      case 'ALLOCATED*':
      case 'ALLOCATED#':
      case 'MIXED':
      case 'MIXED*':
      case 'COMPLETING':
      case 'COMPLETING*':
        nodeColor = allocatedColor;
        stateColor = colors.LED.AVAILABLE;
        break;
      case 'ALLOCATED+DRAIN':
        nodeColor = allocatedColor;
        stateColor = colors.LED.DRAINED;
        break;
      case 'RESERVED':
        nodeColor = allocatedColor;
        stateColor = colors.LED.RESERVED;
        break;
      case 'DRAINING':
      case 'DRAINING*':
      case 'DRAINED':
      case 'DRAINED*':
      case 'IDLE+DRAIN':
        stateColor = colors.LED.DRAINED;
        nodeColor = colors.LED.UNAVAILABLE;
        break;
      case 'DOWN':
      case 'DOWN*':
      case 'DOWN*+DRAIN':
      case 'DOWN+DRAIN':
        stateColor = colors.LED.DOWN;
        nodeColor = colors.LED.UNAVAILABLE;
        break;
      case 'MAINT':
      case 'MAINT*':
        stateColor = colors.LED.MAINT;
        nodeColor = colors.LED.UNAVAILABLE;
        break;
      default:
        stateColor = colors.LED.NOTVISIBLE;
        nodeColor = colors.LED.UNKNOWN;
        console.warn('Color not handled for node state:', node.state); // eslint-disable-line no-console
      }

      return { node: nodeColor, state: stateColor };
    }
  };
});
