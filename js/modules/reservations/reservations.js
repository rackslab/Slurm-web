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
  'handlebars',
  'text!../../js/modules/reservations/reservations.hbs',
  'token-utils',
  'tablesorter-utils',
  'date-utils',
  'jquery-tablesorter'
], function($, Handlebars, template, tokenUtils, tablesorterUtils) {
  template = Handlebars.compile(template);

  return function(config) {
    this.interval = null;
    this.tablesorterOptions = {};

    this.init = function() {
      var self = this,
        options = {
          type: 'POST',
          dataType: 'json',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          data: JSON.stringify({
            token: tokenUtils.getToken(config.cluster)
          })
        };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/reservations', options)
        .success(function(reservations) {
          var context = {
            count: Object.keys(reservations).length,
            reservations: reservations
          };

          $('#main').append(template(context));
          tablesorterUtils.eraseEmptyColumn('.tablesorter');
          $('.tablesorter').tablesorter(self.tablesorterOptions);

          $('tr').on('click', function(e) {
            var reservation = $($($(this).children('td'))[0]).html();

            $(document).trigger('show', { page: 'jobs', filter: { type: 'reservation', value: reservation } });
          });
        });
    };

    this.refresh = function() {
      var self = this;

      this.interval = setInterval(function() {
        self.tablesorterOptions = tablesorterUtils.findTablesorterOptions('.tablesorter');
        $('#reservations').remove();
        self.init();
      }, config.REFRESH);
    };

    this.destroy = function() {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#reservations').remove();
      $('tr').off('click');
    };

    return this;
  };
});
