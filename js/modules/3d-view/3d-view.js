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

var isIE = /*@cc_on!@*/false || !!document.documentMode;

if (isIE) {
  console.log('IE detected, 3D-view not loaded');
} else {
  console.log('IE not detected, 3D-view loaded');

define([
  'jquery',
  'handlebars',
  'text!../../js/modules/3d-view/3d-view.hbs',
  'token-utils',
  '3d-draw',
  '3d-map-draw',
  'jobs-utils',
  'keycode-helpers'
], function ($, Handlebars, template1, token, d3Draw, d3MapDraw, jobsUtils) {
  return function (config) {
    template = Handlebars.compile(template1);

    this.setCanvasSize = function (canvas) {
      $('canvas').removeAttr('style');
      $('canvas').attr('width', canvas.width);
      $('canvas').attr('height', canvas.height);
    }

    this.getCanvas = function () {
      return {
        element: $('canvas')[0],
        width: $(window).innerWidth() - 
          $('canvas').parent('div').offset().left - 
          parseInt($('#main').css('paddingRight').replace(/[^-\d\.]/g, '')),
        height: $(window).innerHeight() - 
          $('canvas').parent('div').offset().top - 
          (parseInt($('#main').css('paddingTop').replace(/[^-\d\.]/g, '')) + parseInt($('#main').css('paddingBottom').replace(/[^-\d\.]/g, '')))
      };
    }

    this.init = function () {
      var self = this;
      $('#main').append(template());

      $('#tabs a[href="#camera"]').on('show.bs.tab', function (e) {
        $(document).trigger('camera-change', { cameraType: $(this).attr('aria-controls')});
      });

      this.canvas = self.getCanvas();

      $('canvas').attr('width', self.canvas.width);
      $('canvas').attr('height', self.canvas.height);

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

      $.ajax(config.cluster.api.url + config.cluster.api.path + '/racks', options)
        .success(function (data) {
          $.ajax(config.cluster.api.url + config.cluster.api.path + '/nodes', options)
            .success(function (nodesInfos) {
              $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', options)
                .success(function (jobs) {
                  var racks = data.racks;
                  var room = data.room;

                  jobs = jobsUtils.buildAllocatedCPUs(jobs);

                  var map = d3MapDraw.racksToMap(racks);

                  var racksList = {};

                  var range;
                  var rack;
                  for (var range in racks) {
                    if (racks.hasOwnProperty(range)) {
                      for (var rack in racks[range]) {
                        racksList[racks[range][rack].name] = racks[range][rack];
                      }
                    }
                  }

                  $('#tabs a[href="#fullscreen"]').on('click', function (e) {
                    var element = document.getElementsByTagName('canvas')[0];

                    if (element.requestFullscreen) {
                      element.requestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    } else if (element.msRequestFullscreen) {
                      element.msRequestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    } else if (element.mozRequestFullScreen) {
                      element.mozRequestFullScreen();
                      $(document).trigger('fullscreen-enter');
                    } else if (element.webkitRequestFullscreen) {
                      element.webkitRequestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    }
                  });

                  $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function (e) {
                    if (!document.fullscreen && !document.mozFullScreen && !document.webkitIsFullScreen && !document.msFullscreenElement) {
                      setTimeout(function () {
                        self.setCanvasSize(self.canvas);
                        $(document).trigger('fullscreen-exit', { canvas: self.canvas });
                      }, 1000);
                    }
                  });

                  $('[data-toggle=offcanvas]').on('click', function () {
                    setTimeout(function () {
                      self.canvas = self.getCanvas();
                      self.setCanvasSize(self.canvas);
                      $(document).trigger('canvas-size-change', { canvas: self.canvas });
                    }, 1000);
                  });

                  self.draw = new d3Draw(map, racksList, nodesInfos, jobs, room);
                  self.draw.init(self.canvas.element);
                });
            })
        });
    };

    this.destroy = function () {
      $('#tabs a[href="#fullscreen"]').off('click');
      $('#tabs a[href="#camera"]').off('show.bs.tab');
      $('[data-toggle=offcanvas]').off('click');
      $(document).off('fullscreen-enter fullscreen-exit');
      $(document).off('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange');
      $(document).off('camera-change screen-change');
      $(document).off('cluster-change-state');
      $('#3d-view').remove();

      if (this.draw) {
        this.draw.clean();
      }
    };

    return this;
  };
});

}
