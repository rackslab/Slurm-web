define(['jquery', 'handlebars', 'text!../../js/modules/partitions/partitions.hbs',  'text!config.json', 'token-utils', 'tablesorter-utils', 'array-utils', 'boolean-utils', 'jquery-tablesorter'], function ($, Handlebars, template, config, token, tablesorter) {
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

      $.ajax(config.apiURL + config.apiPath + '/partitions', options)
        .success(function (partitions) {
          var context = {
            count: Object.keys(partitions).length,
            partitions: partitions
          };

          $('body').append(template(context));
          $('.tablesorter').tablesorter(self.tablesorterOptions);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        self.tablesorterOptions = tablesorter.findTablesorterOptions('.tablesorter');
        $('#partitions').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#partitions').parent('.container-fluid').remove();
    };

    return this;
  };
});
