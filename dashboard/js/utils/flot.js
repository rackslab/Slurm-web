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
  function percent(value, total) {
    return Math.round(value * 100 / total);
  }

  return {
    addPercentInLegend: function(tab) {
      var i, total = 0;

      for (i = 0; i < tab.length; i++) {
        total += tab[i].data;
      }

      for (i = 0; i < tab.length; i++) {
        tab[i].label += ' (' + percent(tab[i].data, total) + '%)';
      }

      return tab;
    }
  };
});
