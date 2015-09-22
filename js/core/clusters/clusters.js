define(['jquery', 'handlebars', 'text!../../js/core/clusters/clusters.hbs'], function ($, Handlebars, template) {
  template = Handlebars.compile(template);
  clusters = window.clusters;
  for (var index in clusters) {
    clusters[index].id = clusters[index].name + '-' + index;
  }

  return function (config) {
    var self = this;
    var context = {};

    $(document).on('selectCluster', function(e, options) {
      e.stopPropagation();
      var cluster = clusters[options.clusterId];

      // retrieve informations about authentication on the selected cluster
      if (!cluster.authentication) {
        $.ajax(cluster.api.url + cluster.api.path + '/authentication', { async: false })
          .success(function (response) {
            cluster.authentication = response;
          })
          .error(function (error) {
            console.log(error);
          });
      }

      config.cluster = cluster;
      $(document).trigger('loadPage', { config: config });
    });

    this.init = function () {
      var context = {
        clusters: clusters,
        paddingTop: $('nav').height()
      }

      if (!clusters.length) {
        var loc = window.location;
        clusters.push({
          name: 'local',
          api: {
            url: loc.origin || loc.protocol + '//' + loc.host,
            path: '/slurm-restapi'
          }
        })
      }

      $(document).trigger('selectCluster', { clusterId: 0 });

      if (clusters.length <= 1) {
        $(document).ready(function() {
          $('#main p.visible-xs').remove();
          $('#main').removeClass('col-md-10');
          $('#main').addClass('col-md-12');
          $('#clusters').addClass('hidden');
        });

        return;
      }

      $('#clusters').append(template(context));

      $('.cluster').on('click', function(e) {
        e.stopPropagation();

        // abort if the selected cluster is yet the current one
        if (config.cluster === clusters[$(this).data('id')]) {
            return false;
        }

        $(document).trigger('selectCluster', { clusterId: $(this).data('id') });
      });

      $(document).ready(function() {
        $('[data-toggle=offcanvas]').click(function() {
          if ($('body').width() < 768) {
            $('.row-offcanvas').toggleClass('active');
          } else {
            $('#main').toggleClass('col-md-10');
            $('#main').toggleClass('col-md-12');
            $('#clusters').toggleClass('hidden');
          }
        });
      });

      $(window).on('resize', function() {
        if ($('body').width() < 768) {
          $('#main').addClass('col-md-10');
          $('#main').removeClass('col-md-12');
          $('#clusters').removeClass('hidden');
        } else {
          if (!$('.row-offcanvas').hasClass('active')) {
            $('#main').removeClass('col-md-10');
            $('#main').addClass('col-md-12');
            $('#clusters').addClass('hidden');
          }
        }
      });
    };

    this.destroy = function () {
      if (clusters.length <= 1) {
        $('#clusters').empty();
      }
    };

    return this;
  }
});
