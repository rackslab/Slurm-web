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
  'async',
  'handlebars',
  'text!../../js/core/login/login.hbs',
  'token-utils',
  'user-utils',
  'fake-placeholder'
], function($, async, Handlebars, template, tokenUtils, userUtils, fakePlaceholder) {
  template = Handlebars.compile(template);

  return function(config) {
    function loginAction(options) {
      function loginOnCluster(cluster, callback) {
        // skip authentication if not enabled on cluster
        // or automatic login disabled and not current cluster
        if (!cluster.authentication.enabled || !config.AUTOLOGIN && config.cluster.id !== cluster.id) {
          callback(null, null);
          return;
        }

        async.series([
          function(callback) {
            // login on cluster, call route /login
            if (userUtils.getUser(cluster)) {
              // don't do anything if user already authenticated on cluster
              callback(null, null);
              return;
            }

            $.ajax(cluster.api.url + cluster.api.path + '/login', options)
              .success(function(response) {
                tokenUtils.setToken(cluster, response.id_token);
                userUtils.setUser(cluster, response);
                callback(null, null);
              })
              .error(function(error) {
                if (config.cluster.id === cluster.id) {
                  // error if cluster is the current one
                  return callback(true, error);
                }

                // nothing unless
                return callback(null, null);
              });
          },
          function(callback) {
            var options = {
              type: 'POST',
              dataType: 'json',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              data: JSON.stringify({
                token: tokenUtils.getToken(cluster)
              })
            };

            // get infos on cluster, call route /cluster
            if (cluster.infos) {
              // don't do anything if infos are already retrieved
              callback(null, null);
              return;
            }

            $.ajax(cluster.api.url + cluster.api.path + '/cluster', options)
              .success(function(data) {
                cluster.infos = data;
                callback(null, null);
              })
              .error(function(error) {
                callback(true, error);
              });
          }
        ], function(err, result) {
          if (err) {
            callback(true, result);
            return;
          }
          callback(null, null);
        });
      }

      async.map(window.clusters, loginOnCluster, function(err, result) {
        if (err && !userUtils.getUser(config.cluster)) {
          $('#login #error').show();
          return;
        }

        $(document).trigger('logged');
        $(document).trigger('show', { page: config.STARTPAGE });
      });
    }

    this.init = function() {
      var options = {
        type: 'POST',
        dataType: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      function submitLogin(e) {
        var form = {
          username: $('#login #username').val(),
          password: $('#login #password').val()
        };

        if (e.type === 'keypress' && e.which !== 13) {
          return;
        }

        if (!form.username || !form.password) {
          $('#login #error').show();
        } else {
          options.data = JSON.stringify({
            username: form.username,
            password: form.password
          });
          loginAction(options);
        }
      }

      function submitGuest() {
        options.data = JSON.stringify({
          guest: true
        });
        loginAction(options);
      }

      $('#main').append(template());
      $(document).trigger('pageLoaded');

      // hack for placeholder in IE
      if ($.browser.msie) {
        fakePlaceholder();
      }

      if (config.cluster.authentication.guest) {
        $('#login #guest').show();
      }

      // bind login form events
      $('#login #user').on('click', submitLogin);
      $('#login input').on('keypress', submitLogin);
      $('#login #guest').on('click', submitGuest);
    };

    this.destroy = function() {
      $('#login input').off('keypress');
      $('#login #user').off('click');
      $('#login #guest').off('click');
      $('#login').remove();
    };

    return this;
  };
});
