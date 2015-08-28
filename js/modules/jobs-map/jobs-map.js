define(['jquery', 'handlebars', 'text!../../js/modules/jobs-map/jobs-map.hbs', 'text!config.json', 'token-utils', 'draw-utils', 'nodes-utils', 'jobs-utils'], function ($, Handlebars, template, config, token, draw, nodes, jobs) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  draw = new draw();

  return function () {
    this.slurmNodes = null;
    this.interval = null;
    this.canvasConfig = draw.getConfig();

    this.init = function () {
      var self = this;
      var allocatedCPUs = null;
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
      allocatedCPUs = jobs.buildAllocatedCPUs(jobs.getJobs());

      $.ajax(config.apiURL + config.apiPath + '/racks', options)
        .success(function (racks) {
          var context = {
            canvas: self.canvasConfig,
            racks: racks
          };

          $('body').append(template(context));

          $.each(racks, function (idRack, rack) {
            $('#cv_rackmap_' + idRack).click(function (e) {
              e.preventDefault();
              var offset = $(this).offset();

              $(document).trigger('canvas-click', { rack: idRack, x: (e.pageX - offset.left), y: (e.pageY - offset.top) });
            });

            draw.drawRack(rack);
            $.each(rack.nodes, function (idRacknode, rackNode) {
              draw.drawNodeCores(rack, rackNode, self.slurmNodes[rackNode.name], allocatedCPUs[rackNode.name]);
            });
          });

          //draw.drawJobsMapLegend(self.ctx);
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#jobsmap').parent('.container-fluid').remove();
        self.init();
      }, config.apiRefresh);
    };

    this.destroy = function () {
      if (this.interval) {
        clearInterval(this.interval);
      }

      $('#jobsmap').parent('.container-fluid').remove();
    };

    return this;
  };
});
