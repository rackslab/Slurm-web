define(['jquery', 'handlebars', 'text!../../js/modules/qos/qos.hbs',  'text!config.json', 'token-utils', 'tablesorter-utils', 'number-utils', 'jquery-tablesorter'], function ($, Handlebars, template, config, token, tablesorter) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);

  return function () {
    this.interval = null;
    this.tablesorterOptions = {};

    this.init = function () {
      var self = this;
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

      $.ajax(config.apiURL + config.apiPath + '/qos', options)
        .success(function (qos) {
          var context = {
            count: Object.keys(qos).length,
            qos: qos
          };

          $('body').append(template(context));
          $('.tablesorter').tablesorter(self.tablesorterOptions);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        self.tablesorterOptions = tablesorter.findTablesorterOptions('.tablesorter');
        $('#qos').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#qos').parent('.container-fluid').remove();
    };

    return this;
  };
});
