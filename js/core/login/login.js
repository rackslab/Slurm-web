define(['jquery', 'handlebars', 'text!../../js/core/login/login.hbs', 'token-utils', 'user-utils'], function ($, Handlebars, template, token, user) {
  template = Handlebars.compile(template);

  return function (config) {
    function login(options) {
      $.post(config.cluster.api.url + config.cluster.api.path + '/login', options)
        .success(function (credentials) {
          token.setToken(credentials.id_token);
          user.setUser(credentials.username, credentials.role);
          $(document).trigger('logged');
          $(document).trigger('show', { page: config.firstPage });
        })
        .error(function () {
          $('#login #error').show();
        });
    };

    this.init = function () {
      $('body').append(template());

      $.get(config.cluster.api.url + config.cluster.api.path + '/guest')
        .success(function (response) {
          if (response.guest)
            $('#login #guest').show();
        })
        .error(function (error) {
          console.log(error);
        });

      $('#login #user').on('click', function () {
        var form = {
          username: $('#login #username').val(),
          password: $('#login #password').val()
        };

        if (!form.username || !form.password) {
          $('#login #error').show();
        } else {
          var options = {
            mimeType: 'multipart/form-data',
            username: form.username,
            password: form.password
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
              mimeType: 'multipart/form-data',
              username: form.username,
              password: form.password
            };

            login(options);
          }
        }
      });

      $('#login #guest').on('click', function () {
        var options = {
          mimeType: 'multipart/form-data',
          guest: true
        };

        login(options)
      })
    };

    this.destroy = function () {
      $('#login input').off('keypress');
      $('#login #user').off('click');
      $('#login #guest').off('click');
      $('#login').parent('.container-fluid').remove();
    };

    return this;
  }
});
