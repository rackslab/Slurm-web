define(['jquery', 'handlebars', 'text!../../js/modules/reservations/reservations.hbs',  'text!config.json', 'token', 'date', 'jquery-tablesorter'], function ($, Handlebars, template, config, token) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);

  return function () {
    this.interval = null;

    this.init = function () {
      var options = {
        type: 'POST',
        dataType: 'json',
        crossDomain: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken()
        })
      };

      $.ajax(config.apiURL + config.apiPath + '/reservations', options)
        .success(function (reservations) {
          var context = {
            count: Object.keys(reservations).length,
            reservations: reservations
          };

          $('body').append(template(context));
          $('.tablesorter').tablesorter();
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#reservations').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#reservations').parent('.container-fluid').remove();
    };

    return this;
  };
});
