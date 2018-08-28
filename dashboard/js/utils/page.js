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
  return function(pageName) {
    this.pageName = pageName;

    this.init = function() {
      return;
    };
    this.refresh = function() {
      return;
    };
    this.stopRefresh = function() {
      return;
    };
    this.destroy = function() {
      return;
    };
    this.getPageName = function() {
      return this.pageName;
    };

    return this;
  };
});
