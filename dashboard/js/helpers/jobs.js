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
  'handlebars',
  'text!/slurm-web-conf/2d.colors.config.json',
  'date-utils'
], function(Handlebars, colorsConfig, dateUtils) {
  var colors = JSON.parse(colorsConfig);


  Handlebars.registerHelper('pickJobColor', function(jobId) {
    return colors.JOB[jobId % colors.JOB.length];
  });

  Handlebars.registerHelper('printCommand', function(command) {
    if (command === null) {
      return '-';
    }

    return command;
  });

  Handlebars.registerHelper('printStateReason', function(state) {
    if (state === 'None') {
      return '-';
    }

    return state;
  });

  Handlebars.registerHelper('printReason', function(state, reason) {
    if (state === 'RUNNING' || state === 'COMPLETED') {
      return '-';
    }

    return reason;
  });

  Handlebars.registerHelper('printStartTime', function(timestamp, eligibleTimestamp, state) {
    if (state === 'PENDING' && timestamp > 0) {
      return 'within ' + dateUtils.getTimeDiff(timestamp * 1000);
    }

    if (state === 'PENDING' && !(new Date(eligibleTimestamp * 1000) < new Date())) {
      return 'within ' + dateUtils.getTimeDiff(eligibleTimestamp * 1000);
    }

    if (state === 'RUNNING') {
      return 'since ' + dateUtils.getTimeDiff(timestamp * 1000);
    }

    return '-';
  });

  // Handlebar helper to access parent context in a partial. This feature will
  // be included natively in handlebar 2.0.
  Handlebars.registerHelper('include', function(options) {
    var context = {},
    mergeContext = function(obj) {
      for(var k in obj)context[k]=obj[k];
      };
    mergeContext(this);
    mergeContext(options.hash);
    return options.fn(context);
  });

  // handlebar helper to compare 2 objects
  Handlebars.registerHelper('isEqual', function(v1, v2, options){
    if(v1 === v2){
      return options.fn(this);
    }
    return options.inverse(this);
  });
});
