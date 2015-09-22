define([
  'jquery',
  'handlebars',
  'text!../../js/modules/qos/qos.hbs',
  'token-utils',
  'tablesorter-utils',
  'number-utils',
  'jquery-tablesorter'
], function ($, Handlebars, template, tokenUtils, tablesorterUtils) {
  template = Handlebars.compile(template);

  return function(config) {
    this.interval = null;
    this.tablesorterOptions = {};

    this.init = function () {
      var self = this;
      var options = {
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

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/qos', options)
        .success(function (qos) {
          var context;

          if (qos.error) {
            context = {
              error: qos.error
            }
            if (self.interval) {
              clearInterval(self.interval);
            }
          } else {
            context = {
              count: Object.keys(qos).length,
              qos: qos
            };
          }

          $('#main').append(template(context));
          tablesorterUtils.eraseEmptyColumn('.tablesorter');
          $('.tablesorter').tablesorter(self.tablesorterOptions);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        self.tablesorterOptions = tablesorterUtils.findTablesorterOptions('.tablesorter');
        $('#qos').remove();
          self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#qos').remove();
    };

    return this;
  };
});
