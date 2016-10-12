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
], function($) {
  var user = {
    setUser: function(cluster, user) {
      var userStored = JSON.stringify({
        login: user.login,
        role: user.role,
        name: user.name,
        restrictedViews: user.restricted_views // eslint-disable-line no-trailing-spaces
      });

      localStorage.setItem('user-' + cluster.id, userStored);
    },
    getUser: function(cluster) {
      return JSON.parse(localStorage.getItem('user-' + cluster.id));
    },
    removeUser: function(cluster) {
      localStorage.removeItem('user-' + cluster.id);
    }
  };

  $(document).on('logout', function(e, options) {
    e.preventDefault();

    if (options && options.cluster) {
      user.removeUser(options.cluster);
    }
  });

  return user;
});
