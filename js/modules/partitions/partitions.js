define(['jquery', 'handlebars', 'text!/js/modules/partitions/partitions.hbs',  'text!/js/core/config.json', 'token', 'tablesorter', 'array', 'boolean'], function ($, Handlebars, template, config, token) {
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

      $.ajax(config.apiURL + config.apiPath + '/partitions', options)
        .success(function (partitions) {
          var context = {
            count: Object.keys(partitions).length
            partitions: partitions
          };

          $('body').append(template(context));
          $('.tablesorter').tablesorter();
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#partitions').parent('.container-fluid').remove();
        self.init();
      }, config.refresh);
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
