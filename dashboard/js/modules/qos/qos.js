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
  'text!../../js/modules/qos/qos.hbs',
  'token-utils',
  'ajax-utils',
  'error-utils',
  'tablesorter-utils',
  'number-helpers',
  'jquery-tablesorter'
], function($, Handlebars, template, tokenUtils, ajaxUtils, errorUtils, tablesorterUtils) {
  template = Handlebars.compile(template);

  return function(config) {
    this.interval = null;
    this.tablesorterOptions = {};
    this.scrollTop = 0;

    this.saveUI = function () {
      this.scrollTop = $(window).scrollTop();
    }

    this.loadUI = function () {
      $(window).scrollTop(this.scrollTop);
    }

    this.init = function() {
      var self = this;

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/qos', ajaxUtils.getAjaxOptions(config.cluster))
        .success(function(qos) {
          var context;

          if (qos.error) {
            errorUtils.setError(qos.error);

            if (self.interval) {
              clearInterval(self.interval);
            }
          } else {
            context = {
              noData: !Object.keys(qos).length,
              count: Object.keys(qos).length,
              qos: qos
            };
          }

          $('#main').append(template(context));
          $(document).trigger('pageLoaded');

          tablesorterUtils.eraseEmptyColumn('.tablesorter');
          $('.tablesorter').tablesorter(self.tablesorterOptions);

          $('tr').on('click', function(e) {
            var qos = $($($(this).children('td'))[0]).html();

            $(document).trigger('show', { page: 'jobs', filter: { type: 'qos', value: qos } });
          });

          self.loadUI();
        });
    };

    this.refresh = function() {
      var self = this;

      this.interval = setInterval(function() {
        self.saveUI();
        self.tablesorterOptions = tablesorterUtils.findTablesorterOptions('.tablesorter');
        $('#qos').remove();
        self.init();
      }, config.REFRESH);
    };

    this.stopRefresh = function(){
      clearInterval(this.interval);
    }

    this.destroy = function() {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('tr').off('click');
      $('#qos').remove();
    };

    return this;
  };
});
