define(['jquery', 'handlebars', 'text!../../js/core/clusters/clusters.hbs'], function ($, Handlebars, template) {
  template = Handlebars.compile(template);
  clusters = window.clusters;
  for (var index in clusters) {
    clusters[index].id = clusters[index].name + '-' + index;
  }

  return function (config) {
    var self = this;
    var context = {};

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

      config.cluster = clusters[0];

      if (clusters.length <= 1)
        return;

      $('body').css("margin-left", "50px");
      $('body').append(template(context));
      $('#clusters').css("padding-bottom", ($('#clusters .text').width() + 20) + "px");

      $(document).on('navbarLoaded', function (e, options) {
        e.stopPropagation();
        $('#clusters').css("padding-top", options.height + "px");
      });

      $('.cluster').on('click', function(e) {
        e.stopPropagation();

        if (config.cluster === clusters[$(this).data('id')]) {
            return false;
        }

        config.cluster = clusters[$(this).data('id')];
        $(document).trigger('loadPage', { config: config });
      });
    };

    this.destroy = function () {
      if (clusters.length <= 1) {
        $('#clusters').remove();
      }
    };

    return this;
  }
});
