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
  $(document).ajaxError(function(event, jqueryXHR, error, errorThrown) {
    if (!jqueryXHR.status) {
      console.log(JSON.stringify(event), JSON.stringify(jqueryXHR), JSON.stringify(error), JSON.stringify(errorThrown));  // eslint-disable-line no-console
      $('#flash .alert').text('Error : ' + JSON.stringify(error));
      $('#flash').show();
    }
    if (jqueryXHR.status === 403 && !(error.url.indexOf('/login') > -1)) {
      $(document).trigger('logout');
    }
  });
});
