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

var isIE = /*@cc_on!@*/false || Boolean(document.documentMode);

if (isIE) {
  console.log('IE detected, 3D-view not loaded'); // eslint-disable-line no-console
} else {
  console.log('IE not detected, 3D-view loaded'); // eslint-disable-line no-console

  define([
    'jquery',
    'handlebars',
    'text!../../js/modules/3d-view/3d-view.hbs',
    'token-utils',
    'jobs-utils',
    'keycode-helpers'
  ], function($, Handlebars, template, token, jobsUtils) {
    template = Handlebars.compile(template);

    return function(config) {
      this.init = function() {
        var iframeHeight,
          context = {
            cluster: encodeURIComponent(JSON.stringify(config.cluster))
          };

        $('#main').append(template(context));
        $(document).trigger('pageLoaded');

        iframeHeight = $(window).innerHeight() -
          $('iframe').offset().top -
          parseInt($('#main').css('paddingBottom').replace(/[^-\d\.]/g, ''), 10) -
          5;

        $('#main iframe').attr('height', iframeHeight);

        $(document).on('fullscreen-enter', function() {
          var element = document.getElementsByTagName('iframe')[0];

          if (element.requestFullscreen) {
            element.requestFullscreen();
          } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
          } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
          } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
          }
        });

        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function(e) {
          if (!document.fullscreen && !document.mozFullScreen && !document.webkitIsFullScreen && !document.msFullscreenElement) {
            setTimeout(function() {
              $(document).trigger('fullscreen-exit');
            }, 1000);
          }
        });
      };

      this.destroy = function() {
        $(document).trigger('destroy');
        $(document).off('fullscreen-enter webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange');
        $('iframe').remove();
        $('#3d-view').remove();
      };

      return this;
    };
  });
}
