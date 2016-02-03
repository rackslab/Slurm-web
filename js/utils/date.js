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

define([], function () {
  return {
    getTimeDiff: function (datetime) {
      if (isNaN(datetime)) {
        return "";
      }

      var now = new Date().getTime(),
          diff = Math.abs(datetime - now) / 1000, // compute diff in seconds
          days = Math.floor(diff  / (24 * 60 * 60)),
          hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60)),
          minutes = Math.floor((diff % (60 * 60)) / 60),
          seconds = Math.floor(diff % 60),
          prettyDate = "";

      prettyDate += days === 0 ? "" : days + "d ";
      prettyDate += hours === 0 ? "" : hours + "h ";
      prettyDate += minutes === 0 ? "" : minutes + "min ";
      prettyDate += seconds === 0 ? "" : seconds + "s";

      return prettyDate;
    }
  };
});
