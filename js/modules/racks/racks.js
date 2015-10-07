define([
  'jquery',
  'handlebars',
  'text!../../js/modules/racks/racks.hbs',
  'token-utils',
  '2d-draw',
  '2d-legend-draw',
  'nodes-utils'
], function ($, Handlebars, template, tokenUtils, D2Draw, d2LegendDraw, nodesUtils) {
  template = Handlebars.compile(template);
  var draw = new D2Draw();

  return function (config) {
    this.slurmNodes = null;
    this.interval = null;
    this.config = draw.getConfig();

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

      this.slurmNodes = nodesUtils.getNodes(config);

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', options)
        .success(function (data) {
          var racks = data.racks;
          if (racks instanceof Array) {
            var result = {};
            var i;
            var rack;
            for (i in racks) {
              if (racks.hasOwnProperty(i)) {
                for (rack in racks[i]) {
                  if (racks[i].hasOwnProperty(rack)) {
                    result[rack] = racks[i][rack];
                  }
                }
              }
            }
            racks = result;
          }

          var context = {
            config: self.config,
            racks: racks
          };

          $('#main').append(template(context));

          $.each(racks, function (idRack, rack) {
            draw.drawRack(rack);
            $.each(rack.nodes, function (idRackNode, rackNode) {
              draw.drawNode(rack, rackNode, self.slurmNodes[rackNode.name]);
            });
          });

          d2LegendDraw.drawLegend('racks');
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#racks').remove();
        self.init();
      }, config.REFRESH);
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
