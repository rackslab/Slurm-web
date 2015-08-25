define(['jquery', 'handlebars', 'text!/js/modules/racks/racks.hbs', 'text!/js/core/config.json', 'token-utils', 'draw-utils', 'nodes-utils'], function ($, Handlebars, template, config, token, draw, nodes) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);

  return function () {
    this.slurmNodes = null;
    this.ctx = null;
    this.interval = null;

    this.init = function () {
      var self = this;
      var options = {
        method: 'POST',
        url: config.apiURL + config.apiPath + '/racks',
        cache: false,
        type: 'json',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token.getToken()
        })
      };

      this.slurmNodes = nodes.getNodes();

      $.ajax(options)
        .success(function (racks) {
          var context = {
            canvas: config.canvas
          };

          $('body').append(template(context));
          self.ctx = $('#cv_rackmap');

          $.each(racks, function (idRack, rack) {
            draw.drawRack(self.ctx, rack);
            $.each(rack.nodes, function (idRackNode, rackNode) {
              draw.drawNode(self.ctx, rack, rackNode, self.slurmNodes[rackNode.name]);
            });
          });

          nodes.drawRacksLegend(self.ctx, false);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#racks').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#racks').parent('.container-fluid').remove();
    };

    return this;
  };
});
