define(['jquery', 'handlebars', 'text!../../js/modules/jobs-map/jobs-map.hbs', 'text!../../js/modules/jobs-map/modal-core.hbs', 'text!../../js/modules/jobs-map/modal-node.hbs', 'text!config.json', 'token-utils', 'draw-utils', 'nodes-utils', 'jobs-utils'], function ($, Handlebars, template, modalCoreTemplate, modalNodeTemplate, config, token, draw, nodes, jobs) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);
  modalCoreTemplate = Handlebars.compile(modalCoreTemplate);
  modalNodeTemplate = Handlebars.compile(modalNodeTemplate);
  draw = new draw();

  return function () {
    this.slurmNodes = null;
    this.interval = null;
    this.canvasConfig = draw.getConfig();

    function closeModalCore(e) {
      e.stopPropagation();

      $('#modal-core').remove();
    }

    function closeModalNode(e) {
      e.stopPropagation();

      $('#modal-node').remove();
    }

    function toggleModalCore(jobId) {
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

      $.ajax(config.apiURL + config.apiPath + '/job/' + jobId, options)
        .success(function (job) {
          var context = {
            jobId: jobId,
            job: job
          };

          $('body').append(modalCoreTemplate(context));
          $('#modal-core').on('hidden.bs.modal', closeModalCore);
          $('#modal-core').modal('show');
        });
    }

    function toggleModalNode(nodeId) {
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

      $.ajax(config.apiURL + config.apiPath + '/jobs-by-node/' + nodeId, options)
        .success(function (jobs) {
          var context = {
            count: Object.keys(jobs).length,
            nodeId: nodeId,
            jobs: jobs
          };

          $('body').append(modalNodeTemplate(context));
          $('#modal-node').on('hidden.bs.modal', closeModalNode);
          $('#modal-node').modal('show');
        });
    }

    $(document).on('modal-core', function (e, options) {
      e.stopPropagation();

      toggleModalCore(options.jobId);
    });

    $(document).on('modal-node', function (e, options) {
      e.stopPropagation();

      toggleModalNode(options.nodeId);
    });

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
            $('#cv_rackmap_' + idRack).on('click', function (e) {
              e.stopPropagation();
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

      $("canvas[id^='cv_rackmap_']").off('click');
      $('#modal-core').off('hidden.bs.modal');
      $('#modal-core').remove();
      $('#modal-node').off('hidden.bs.modal');
      $('#modal-node').remove();
      $('#jobsmap').parent('.container-fluid').remove();
      $(document).off('modal-core');
    };

    return this;
  };
});
