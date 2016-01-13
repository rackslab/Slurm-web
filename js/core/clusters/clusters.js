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
  'handlebars',
  'text!../../js/core/clusters/clusters.hbs'
], function ($, Handlebars, template) {
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

      var loadSelectedCluster = function() {
        if (options.$cluster) {
          $('.cluster').parent('li').removeClass('active');
          options.$cluster.parent('li').addClass('active');
        }

        config.cluster = cluster;
        $(document).trigger('loadPage', { config: config });
      }

      // retrieve informations about authentication on the selected cluster
      if (!cluster.authentication) {
        $.ajax(cluster.api.url + cluster.api.path + '/authentication')
          .success(function (response) {
            cluster.authentication = response;
            loadSelectedCluster();
          })
          .error(function (error) {
            console.log(error);
          });
      } else {
        loadSelectedCluster();
      }
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

        $(document).trigger('selectCluster', { clusterId: $(this).data('id'), $cluster: $(this) });
      });

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
        $('.cluster').parent('li').first().addClass('active');
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
