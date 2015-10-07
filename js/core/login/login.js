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
  'text!../../js/core/login/login.hbs',
  'token-utils',
  'user-utils'
], function ($, Handlebars, template, tokenUtils, userUtils) {
  template = Handlebars.compile(template);

  return function (config) {
    function login(options) {
      $.ajax(config.cluster.api.url + config.cluster.api.path + '/login', options)
        .success(function (credentials) {
          tokenUtils.setToken(config.cluster, credentials.id_token);
          userUtils.setUser(config.cluster, credentials.username, credentials.role);
          $(document).trigger('logged');
          $(document).trigger('show', { page: config.STARTPAGE });
        })
        .error(function () {
          $('#login #error').show();
        });
    };

    this.init = function () {
      $('#main').append(template());

      if (config.cluster.authentication.guest)
        $('#login #guest').show();

      $('#login #user').on('click', function () {
        var form = {
          username: $('#login #username').val(),
          password: $('#login #password').val()
        };

        if (!form.username || !form.password) {
          $('#login #error').show();
        } else {
          var options = {
            type: 'POST',
            dataType: 'json',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            data: JSON.stringify({
              username: form.username,
              password: form.password
            })
          };

          login(options);
        }
      })

      $('#login input').on('keypress', function (e) {
        if (e.which === 13) {
          var form = {
            username: $('#login #username').val(),
            password: $('#login #password').val()
          };

          if (!form.username || !form.password) {
            $('#login #error').show();
          } else {
            var options = {
              type: 'POST',
              dataType: 'json',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              data: JSON.stringify({
                username: form.username,
                password: form.password
              })
            };

            login(options);
          }
        }
      });

      $('#login #guest').on('click', function () {
        var options = {
          type: 'POST',
          dataType: 'json',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          data: JSON.stringify({
            guest: true
          })
        };

        login(options)
      })
    };

    this.destroy = function () {
      $('#login input').off('keypress');
      $('#login #user').off('click');
      $('#login #guest').off('click');
      $('#login').remove();
    };

    return this;
  }
});
