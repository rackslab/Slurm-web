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

var isIE = false || Boolean(document.documentMode);

require.config({
  paths: {
    text: '/javascript/requirejs/text.min',
    jquery: '/javascript/jquery/jquery.min',
    async: '/javascript/async/async.min',
    xdomain: '../../../js/libraries/xdomain.min',
    three: '/javascript/three/three.min',
    bootstrap: '/javascript/bootstrap/js/bootstrap',
    'token-utils': '../../../js/utils/token',
    'ajax-utils': '../../../js/utils/ajax',
    'error-utils': '../../../js/utils/error',
    '3d-draw': '../../../js/draw/3d-draw',
    '3d-map-draw': '../../../js/draw/3d-map',
    'factor-draw': '../../../js/draw/factor',
    'colors-draw': '../../../js/draw/colors',
    'three-first-person-controls': '../../../js/modules/3d-view/camera/first-person-controls',
    'three-orbit-controls': '../../../js/modules/3d-view/camera/orbit-controls',
    'three-pacman-auto': '../../../js/modules/3d-view/camera/pacman-auto',
    'jobs-utils': '../../../js/utils/jobs'
  },
  shim: {
    jquery: {
      exports: '$'
    },
    three: {
      exports: 'THREE'
    },
    bootstrap: {
      deps: [ 'jquery' ]
    }
  }
});

if (isIE) {
  require([ 'xdomain' ], function(xdomain) { // eslint-disable-line global-require
    var index, slaves = {};

    for (index in window.clusters) {
      slaves[window.clusters[index].api.url] = window.clusters[index].api.path + '/proxy';
    }
    xdomain.slaves(slaves);
  });
}

function init() {
  require([ // eslint-disable-line global-require
    'jquery',
    'async',
    'token-utils',
    'ajax-utils',
    'error-utils',
    'text!/slurm-web-conf/config.json',
    '3d-draw',
    '3d-map-draw',
    'jobs-utils',
    'bootstrap'
  ], function($, async, tokenUtils, ajaxUtils, errorUtils, config, D3Draw, d3MapDraw, jobsUtils) {
    var options, canvas, draw, url = window.location.toString();

    config = JSON.parse(config);

    function setCanvasSize(canvas) {
      $('canvas').removeAttr('style');
      $('canvas').attr('width', canvas.width);
      $('canvas').attr('height', canvas.height);
    }

    function getCanvas() {
      return {
        element: $('canvas')[0],
        width: $(window).innerWidth(),
        height: $(window).innerHeight() - $('canvas').offset().top
      };
    }

    function parseURL(url) {
      var parser = document.createElement('a'),
        searchObject = {},
        queries, split, i;

      parser.href = url;

      queries = parser.search.replace(/^\?/, '').split('&');
      for (i = 0; i < queries.length; i++) {
        split = queries[i].split('=');
        searchObject[split[0]] = split[1];
      }

      return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        searchObject: searchObject,
        hash: parser.hash
      };
    }

    config.cluster = JSON.parse(decodeURIComponent(parseURL(url).searchObject.cluster));

    var options =  ajaxUtils.getAjaxOptions(config.cluster);

    canvas = getCanvas();
    setCanvasSize(canvas);

    async.parallel({
      racks: function(callback) {
        $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', options)
          .success(function(data) {
            callback(null, data);
          })
          .error(function(err) {
            callback(err, null);
          });
      },
      nodes: function(callback) {
        $.ajax(config.cluster.api.url + config.cluster.api.path + '/nodes', options)
          .success(function(data) {
            callback(null, data);
          })
          .error(function(err) {
            callback(err, null);
          });
      },
      jobs: function(callback) {
        $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', options)
          .success(function(data) {
            callback(null, data);
          })
          .error(function(err) {
            callback(err, null);
          });
      }
    }, function(err, result) {
      var racks, room, nodesInfos, jobs, map, racksList, range, rack;

      if (err) {
        if (err.status === 403) {
          window.parent.$(window.parent.document).trigger('logout');
        } else {
          window.parent.errorUtils.setError(JSON.stringify(err));
        }
        return;
      }

      // show 3d-view
      window.parent.$('#3d-view').css('visibility', 'visible');

      racks = result.racks.racks;
      room = result.racks.room;
      nodesInfos = result.nodes;
      jobs = result.jobs;

      jobs = jobsUtils.buildAllocatedCPUs(jobs);

      map = d3MapDraw.racksToMap(racks);

      racksList = {};

      for (range in racks) {
        if (racks.hasOwnProperty(range)) {
          for (rack in racks[range]) {
            racksList[racks[range][rack].name] = racks[range][rack];
          }
        }
      }

      draw = new D3Draw(map, racksList, nodesInfos, jobs, room);
      draw.init(canvas.element);

      $('#tabs a[href="#camera"]').on('click', function(e) {
        draw.setControls($(this).attr('aria-controls'));
        $('canvas').focus();
      });

      $('canvas').on('mousemove', function() {
        $('canvas').focus();
      });

      $('#tabs a[href="#fullscreen"]').on('click', function(e) {
        $('.row-menu').hide();
        window.parent.$(window.parent.document).trigger('fullscreen-enter');
        setTimeout(function() {
          canvas = getCanvas();
          setCanvasSize(canvas);
          draw.resize(canvas);
        }, 1000);
      });

      window.parent.$(window.parent.document).on('fullscreen-exit', function() {
        $('.row-menu').show();
        canvas = getCanvas();
        setCanvasSize(canvas);
        draw.resize(canvas);
      });

      window.parent.$(window.parent.document).on('destroy', function() {
        draw.clean();
        window.parent.$(window.parent.document).off('fullscreen-exit destroy');
      });
    });
  });
}

init();
