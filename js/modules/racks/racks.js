define(['jquery', 'handlebars', 'text!../../js/modules/racks/racks.hbs', 'token-utils', 'draw-utils', 'draw-legend-utils', 'nodes-utils'], function ($, Handlebars, template, token, Draw, drawLegend, nodes) {
  template = Handlebars.compile(template);
  draw = new Draw();

  return function(config) {
    this.slurmNodes = null;
    this.interval = null;
    this.canvasConfig = draw.getConfig();

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
          token: token.getToken(config.cluster)
        })
      };

      this.slurmNodes = nodes.getNodes(config);

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', options)
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

          $('#main').append(template(context));

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
        $('#racks').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#racks').remove();
    };

    return this;
  };
});
