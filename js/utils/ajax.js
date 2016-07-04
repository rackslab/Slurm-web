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
  function extractDomain(url) {
    return url.split('/').slice(0, 3).join('/');
  }

  $(document).ajaxError(function(event, jqueryXHR, error, errorThrown) {
    var i, concernedCluster,
      currentCluster = window.cluster(),
      isCurrentCluster = currentCluster && error.url.indexOf(currentCluster.api.url) > -1;

    // find cluster concerned by current error
    for (i in window.clusters) {
      concernedCluster = window.clusters[i];
      if (concernedCluster.api.url === extractDomain(error.url)) {
        break;
      }
    }

    if (!jqueryXHR.status && !(error.url.indexOf('/authentication') > -1)) {
      // case when error status is 0
      // logout for concerned cluster
      if (concernedCluster.api.url === extractDomain(error.url)) {
        token.removeToken(concernedCluster);
        user.removeUser(concernedCluster);
      }

      $(document).trigger('displayFailingClusters', { clusters: [ concernedCluster ], show: true });
    }

    if (jqueryXHR.status === 403 && window.page !== 'login' && isCurrentCluster) {
      // case when error status is 403 (FORBIDDEN) and current page not 'login'
      // logout from current cluster only
      $(document).trigger('logout', { cluster: concernedCluster });
    }
    $(document).trigger('pageLoaded');
  });
});
