define([
  'jquery',
  'handlebars',
  'text!../../js/modules/topology/topology.hbs',
  'topology-utils',
  'text!../../js/modules/jobs-map/modal-node.hbs',
  'token-utils'
], function ($, Handlebars, template, Topology, modalNodeTemplate, token) {
  template = Handlebars.compile(template);
  modalNodeTemplate = Handlebars.compile(modalNodeTemplate);

  return function(config) {

    function closeModalNode(e) {
      e.stopPropagation();

      $('#modal-node').remove();
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

    $(document).on('modal-node', function (e, options) {
      e.stopPropagation();

      toggleModalNode(options.nodeId);
    });


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
        }),
      };

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/topology', options)
        .success(function (topologyDatas) {
          var context = {
            noData: !Object.keys(topologyDatas).length,
            error: topologyDatas.error
          };

          $('#main').append(template(context));

          if (topologyDatas.error) {
            return;
          }

          var topology = new Topology(topologyDatas);
          $('#main .wrapper').append(topology.graph.html);

          $('#topology .wrapper').height($(window).height() - (
            $('#navbar').outerHeight()  + parseInt($('#main').css('padding-top').slice(0,2)) + $('#topology .page-header').outerHeight() + parseInt($('#topology .page-header').css('margin-bottom').slice(0,2)) + parseInt($('#main').css('padding-bottom').slice(0,2))
          ));
          $('#topology .graph').height($('#topology .wrapper').height() - 5);
          $('#topology .wrapper').scrollLeft(($('#topology .graph').width() - $('#topology .wrapper').width()) / 2);

          // bind modal-node
          $('.node').on('click', function(e) {
            e.stopPropagation();
            $(document).trigger('modal-node', { nodeId: $(this).data('id') });
          });
        });
    }

    this.destroy = function () {
      $('.node').off('click');
      $('#modal-node').off('hidden.bs.modal');
      $('#modal-node').remove();
      $('#topology').remove();
      $(document).off('modal-node');
    }

    return this;
  };
});
