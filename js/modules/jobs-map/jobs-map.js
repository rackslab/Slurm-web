define(['jquery', 'handlebars', 'text!/js/modules/jobs-map/jobs-map.hbs', 'text!/js/core/config.json', 'token', 'draw', 'nodes', 'jobs'], function ($, Handlebars, template, config, token, draw, nodes, jobs) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);

  return function () {
    this.slurmNodes = null;
    this.ctx = null;
    this.interval = null;

    this.init = function () {
      var self = this;
      var allocatedCPUs = null;
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
      allocatedCPUs = jobs.buildAllocatedCPUs(jobs.getJobs());

      $.ajax(options)
        .success(function (racks) {
          var context = {
            canvas: config.canvas
          };

          $('body').append(template(context));
          self.ctx = $('#cv_rackmap');

          $.each(racks, function (idRack, rack) {
            draw.drawRack(rack);
            $.each(rack.nodes, function (idRacknode, rackNode) {
              draw.drawNodeCores(rack, rackNode, self.slurmNodes[rackNode.name], allocatedCPUs[rackNode.name]);
            });
          });

          nodes.drawJobsMapLegend(self.ctx);
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
