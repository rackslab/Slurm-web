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
    isDST: function () {
      var date = new Date();
      var jan = new Date(date.getFullYear(), 0, 1);
      var jul = new Date(date.getFullYear(), 6, 1);
      return (Math.min(jan.getTimezoneOffset(), jul.getTimezoneOffset()) === date.getTimezoneOffset());
    },

    getTimeDiff: function (datetime) {
      var date = new Date().getTime();

      if (isNaN(datetime)) {
        return "";
      }

      var diff = Math.abs(datetime - date) - (this.isDST() ? 60 * 60 * 1000 : 0);

      var days = Math.floor(diff / 1000 / 60 / (60 * 24));
      var dateDiff = new Date(diff);

      return ((days <= 0 ? "" : days + "d ")
          + (dateDiff.getHours() === 0 ? "" : dateDiff.getHours() + "h ")
          + (dateDiff.getMinutes() === 0 ? "" : dateDiff.getMinutes() + "min ")
          + (dateDiff.getSeconds() === 0 ? "" : dateDiff.getSeconds() + "s"));
    }
  };
});
