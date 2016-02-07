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

define([], function() {
  return {
    getTimeDiff: function(datetime) {
      var now, diff, days, hours, minutes, seconds, prettyDate;

      if (isNaN(datetime)) {
        return '';
      }

      now = new Date().getTime();
      diff = Math.abs(datetime - now) / 1000; // compute diff in seconds
      days = Math.floor(diff / (24 * 60 * 60));
      hours = Math.floor(diff % (24 * 60 * 60) / (60 * 60));
      minutes = Math.floor(diff % (60 * 60) / 60);
      seconds = Math.floor(diff % 60);
      prettyDate = '';

      prettyDate += days === 0 ? '' : days + 'd ';
      prettyDate += hours === 0 ? '' : hours + 'h ';
      prettyDate += minutes === 0 ? '' : minutes + 'min ';
      prettyDate += seconds === 0 ? '' : seconds + 's';

      return prettyDate;
    },
    dateTagToTimestamp: function(format) {
      var i, formatType, units,
        timestamp = Math.floor(new Date().getTime() / 1000);

      if (format === 'now') {
        return timestamp;
      }

      formatType = format[0];

      if (formatType !== '+' || formatType !== '-') {
        formatType = '+';
      } else {
        format = format.substr(1);
      }

      units = format.split(':');

      if (formatType === '-') {
        for (i = 0; i < units.length; i++) {
          if (units[i].slice(-1) === 'y') {
            timestamp -= 365 * 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'M') {
            timestamp -= 31 * 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'w') {
            timestamp -= 7 * 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'd') {
            timestamp -= 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'h') {
            timestamp -= 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'm') {
            timestamp -= 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 's') {
            timestamp -= parseInt(units[i].slice(0, -1), 10);
          }
        }
      } else {
        for (i = 0; i < units.length; i++) {
          if (units[i].slice(-1) === 'y') {
            timestamp += 365 * 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'M') {
            timestamp += 31 * 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'w') {
            timestamp += 7 * 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'd') {
            timestamp += 24 * 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'h') {
            timestamp += 60 * 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 'm') {
            timestamp += 60 * parseInt(units[i].slice(0, -1), 10);
          } else if (units[i].slice(-1) === 's') {
            timestamp += parseInt(units[i].slice(0, -1), 10);
          }
        }
      }

      return timestamp;
    }
  };
});
