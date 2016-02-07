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
  'handlebars'
], function(Handlebars) {
  Handlebars.registerHelper('printDateFromTimestamp', function(timestamp) {
    return timestamp ? (new Date(timestamp * 1000)).toLocaleString() : '-';
  });

  Handlebars.registerHelper('minutesToDelay', function(minutes) {
    var days, hours;

    if (isNaN(minutes)) {
      return minutes;
    }

    days = Math.floor(minutes / 1440);
    minutes -= days * 1440;
    hours = Math.floor(minutes / 60) % 24;
    minutes -= hours * 60;

    return (days === 0 ? '' : days + 'd ') +
      (hours === 0 ? '' : hours + 'h ') +
      (minutes === 0 ? '' : minutes + 'm');
  });
});
