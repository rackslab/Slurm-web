define([
  'jquery',
  'handlebars',
  'text!../../js/modules/partitions/partitions.hbs',
  'token-utils',
  'tablesorter-utils',
  'array-utils',
  'boolean-utils',
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

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/partitions', options)
        .success(function (partitions) {
          var context = {
            count: Object.keys(partitions).length,
            partitions: partitions
          };

          $('#main').append(template(context));
          tablesorterUtils.eraseEmptyColumn('.tablesorter');
          $('.tablesorter').tablesorter(self.tablesorterOptions);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        self.tablesorterOptions = tablesorterUtils.findTablesorterOptions('.tablesorter');
        $('#partitions').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#partitions').remove();
    };

    return this;
  };
});
