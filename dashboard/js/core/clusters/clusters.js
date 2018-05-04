/*
 * Copyright (C) 2015 EDF SA
 *
 * This file is part of slurm-web.
 *
 * slurm-web is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * slurm-web is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

define([
  'jquery',
  'async',
  'handlebars',
  'text!/slurm-web-conf/clusters.config.json',
  'text!../../js/core/clusters/clusters.hbs',
  'ajax-utils',
  'error-utils'
], function($, async, Handlebars, clustersConfig, template, ajaxUtils, errorUtils) {
  window.clusters = JSON.parse(clustersConfig);
  var clusters = window.clusters,
    index;

  template = Handlebars.compile(template);

  for (index in clusters) {
    if (clusters[index]) {
      clusters[index].id = clusters[index].name + '-' + index;
    }
  }

  function retrieveClusterInformations(cluster, callback) {

    $.ajax(cluster.api.url + cluster.api.path + '/cluster', ajaxUtils.getAjaxOptions())
      .success(function(response) {
        cluster.infos = response.data;
        cluster.name = response.data.name;
        cluster.authentication = response.authentication;
        callback(null, null);
      })
      .error(function(error) {
        // remove unreachable cluster from list
        clusters.splice(clusters.indexOf(cluster), 1);

        console.log('error on retrieveClusterInformations for cluster', cluster, error); // eslint-disable-line no-console
        callback(null, cluster);
      });
  }

  return function(config) {
    var lock = false;

    function bindClusterButtons() {
      $('.cluster').on('click', function(e) {
        e.stopPropagation();

        // abort if the selected cluster is yet the current one
        if (config.cluster === clusters[$(this).data('id')] || lock) {
          return false;
        }

        lock = true;

        $(document).trigger('selectCluster', { clusterId: $(this).data('id'), $cluster: $(this) });
      });
    }

    $(document).on('pageLoaded', function() {
      lock = false;
    });

    $(document).on('selectCluster', function(e, options) {
      var cluster = clusters[options.clusterId],
        loadSelectedCluster;

      e.stopPropagation();

      loadSelectedCluster = function() {
        if (options.$cluster) {
          $('.cluster').parent('li').removeClass('active');
          options.$cluster.parent('li').addClass('active');
        }

        config.cluster = cluster;
        $(document).trigger('loadPage', { config: config });
      };

      loadSelectedCluster();
    });

    this.init = function() {
      var loc, context;

      if (!clusters.length) {
        // init default cluster if none defined
        loc = window.location;
        clusters.push({
          name: 'local',
          api: {
            url: loc.origin || loc.protocol + '//' + loc.host,
            path: '/slurm-restapi'
          }
        });
      }

      // retrieve informations about authentication on each cluster
      async.map(clusters, retrieveClusterInformations, function(err, result) {
        var index, $message, failingClusters;

        if (err) {
          console.error('error on retrieve cluster informations', result); // eslint-disable-line no-console
        }

        failingClusters = result.filter(function(cluster) {
          return cluster;
        });

        if (failingClusters.length) {
          for (index in failingClusters) {
            errorUtils.setError('Cluster ' + failingClusters[index].name + ' seems to be unreachable or under maintenance.');
          }

          $('#flash').addClass('display');
        }

        if (!clusters.length) {
          return false;
        }

        context = {
          clusters: clusters,
          paddingTop: $('nav').height()
        };

        $('#clusters').append(template(context));
        bindClusterButtons();

        // select first cluster once clusters informations have been retrieved
        $(document).trigger('selectCluster', { clusterId: 0, $cluster: $('.cluster').first() });
      });

      if (clusters.length <= 1) {
        $(document).ready(function() {
          $('#main p.visible-xs').remove();
          $('#main').removeClass('col-md-10');
          $('#main').addClass('col-md-12');
          $('#clusters').addClass('hidden');
        });

        return;
      }

      $(document).ready(function() {
        if ($('body').width() > 768) {
          $('.row-offcanvas').addClass('active');
        } else {
          $('[data-toggle=offcanvas]').find('i')
            .toggleClass('glyphicon-chevron-left', $('.row-offcanvas').hasClass('active'))
            .toggleClass('glyphicon-chevron-right', !$('.row-offcanvas').hasClass('active'));
        }

        $('[data-toggle=offcanvas]').click(function() {
          $('.row-offcanvas').toggleClass('active');
          $(this).find('i')
            .toggleClass('glyphicon-chevron-left', $('.row-offcanvas').hasClass('active'))
            .toggleClass('glyphicon-chevron-right', !$('.row-offcanvas').hasClass('active'));
          if ($('body').width() > 768) {
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
        } else if (!$('.row-offcanvas').hasClass('active')) {
          $('#main').removeClass('col-md-10');
          $('#main').addClass('col-md-12');
          $('#clusters').addClass('hidden');
        }
      });
    };

    this.destroy = function() {
      if (clusters.length <= 1) {
        $('#clusters').empty();
      }
    };

    return this;
  };
});
