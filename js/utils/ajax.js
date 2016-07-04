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
  'jquery',
  'token-utils',
  'user-utils'
], function($, token, user) {
  $(document).ajaxError(function(event, jqueryXHR, error, errorThrown) {
    var i, cluster,
      isCurrentCluster = window.cluster && error.url.indexOf(window.cluster.api.url) > -1;

    // find concerned cluster
    for (i in window.clusters) {
      cluster = window.clusters[i];
    }

    if (!jqueryXHR.status && !(error.url.indexOf('/authentication') > -1)) {
      // logout for concerned cluster
      if (cluster.api.url === error.url.split('/').slice(0, 3).join('/')) {
        token.removeToken(cluster);
        user.removeUser(cluster);
      }
    }

    if (jqueryXHR.status === 403 && window.page !== 'login' && isCurrentCluster) {
      $(document).trigger('logout');
    }
    $(document).trigger('pageLoaded');
  });
});
