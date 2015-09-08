define(['jquery', 'handlebars', 'text!../../js/modules/racks/racks.hbs', 'text!config.json', 'token-utils', 'draw-utils', 'draw-legend-utils', 'nodes-utils'], function ($, Handlebars, template, config, token, Draw, drawLegend, nodes) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  draw = new Draw();

  return function () {
    this.slurmNodes = null;
    this.interval = null;
    this.canvasConfig = draw.getConfig();

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

      this.slurmNodes = nodes.getNodes();

      $.ajax(config.apiURL + config.apiPath + '/racks', options)
        .success(function (racks) {
          if (racks instanceof Array) {
            result = {};
            for (var i in racks) {
              for (var rack in racks[i]) {
                result[rack] = racks[i][rack];
              }
            }
            racks = result;
          }

          var context = {
            canvas: self.canvasConfig,
            canvasLegend: config.display.canvasLegend,
            racks: racks
          };

          $('body').append(template(context));

          $.each(racks, function (idRack, rack) {
            draw.drawRack(rack);
            $.each(rack.nodes, function (idRackNode, rackNode) {
              draw.drawNode(rack, rackNode, self.slurmNodes[rackNode.name]);
            });
          });

          drawLegend.drawLegend('racks');
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
