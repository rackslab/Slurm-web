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
  return {
    eraseEmptyColumn: function (selector) {
      var totalRow = $(selector + ' tbody tr').length;
      var tabInfos = {};
      var removable = [];

      $(selector + ' tbody tr').each(function (indexTr, itemTr) {
        $(itemTr).children('td').each(function (indexTd, itemTd) {
          if (!tabInfos.hasOwnProperty(indexTd)) {
            tabInfos[indexTd] = 0;
          }

          if (['-', ''].indexOf($(itemTd).text()) + 1) {
            tabInfos[indexTd]++;
          }
        });
      });

      var index;
      for (index in tabInfos) {
        if (tabInfos.hasOwnProperty(index)) {
          if (tabInfos[index] === totalRow) {
            $(selector + ' thead tr').each(function (indexTr, itemTr) {
              removable.push($(itemTr).children('th')[index]);
            });

            $(selector + ' tbody tr').each(function (indexTr, itemTr) {
              removable.push($(itemTr).children('td')[index]);
            });
          }
        }
      }

      var i;
      for (i = 0; i < removable.length; i++) {
        $(removable[i]).remove();
      }
    },
    findTablesorterOptions: function (selector) {
      var options = {
        sortList: []
      };

      $(selector + ' thead tr th').each(function (index, item) {
        if ($(item).hasClass('headerSortUp')) {
          options.sortList.push([index, 1]);
        }
        if ($(item).hasClass('headerSortDown')) {
          options.sortList.push([index, 0]);
        }
      });

      return options;
    }
  };
});
