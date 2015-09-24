define(['jquery', 'handlebars', 'text!../../js/modules/jobs-map/jobs-map.hbs', 'text!../../js/modules/jobs-map/modal-core.hbs', 'text!../../js/modules/jobs-map/modal-node.hbs', 'token-utils', 'draw-utils', 'draw-legend-utils', 'nodes-utils', 'jobs-utils'], function ($, Handlebars, template, modalCoreTemplate, modalNodeTemplate, token, draw, drawLegend, nodes, jobs) {
  template = Handlebars.compile(template);
  modalCoreTemplate = Handlebars.compile(modalCoreTemplate);
  modalNodeTemplate = Handlebars.compile(modalNodeTemplate);
  draw = new draw();

  return function (config) {
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
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/job/' + jobId, options)
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
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs-by-node/' + nodeId, options)
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
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          token: token.getToken(config.cluster)
        })
      };

      this.slurmNodes = nodes.getNodes(config);
      allocatedCPUs = jobs.buildAllocatedCPUs(jobs.getJobs(config));

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

          drawLegend.drawLegend('jobs-map');
        });
    };

    this.refresh = function () {
      var self = this;

      this.interval = setInterval(function () {
        $('#jobsmap').remove();
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
      $('#jobsmap').remove();
      $(document).off('modal-core');
      $(document).off('modal-node');
    };

    return this;
  };
});
