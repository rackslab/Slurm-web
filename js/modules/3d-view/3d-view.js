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
  'draw-three-dimensional-utils',
  'racks-utils',
  'jobs-utils',
  'keycode-utils'
], function ($, Handlebars, template, token, d3Draw, racksUtils, jobsUtils) {
  template = Handlebars.compile(template);

  return function (config) {

    this.init = function () {
      $('#main').append(template());

      $('#tabs a[href="#camera"]').on('show.bs.tab', function (e) {
        $(document).trigger('camera-change', { cameraType: $(this).attr('aria-controls')});
      });

      var canvas = {
        element: $('canvas')[0],
        width: $(window).width() - $('canvas').offset().left * 2,
        height: $(window).height() - $('canvas').offset().top
      };

      $('canvas').attr('width', canvas.width);
      $('canvas').attr('height', canvas.height);

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
        .success(function (racks) {
          $.ajax(config.cluster.api.url + config.cluster.api.path + '/nodes', options)
            .success(function (nodesInfos) {
              $.ajax(config.cluster.api.url + config.cluster.api.path + '/jobs', options)
                .success(function (jobs) {
                  jobs = jobsUtils.buildAllocatedCPUs(jobs);

                  var map = racksUtils.racksToMap(racks);
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
                    if (canvas.element.webkitRequestFullScreen) {
                      canvas.element.webkitRequestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    } else if (canvas.element.mozRequestFullScreen) {
                      canvas.element.mozRequestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    } else if (canvas.element.msRequestFullscreen) {
                      canvas.element.msRequestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    } else if (canvas.element.requestFullScreen) {
                      canvas.element.requestFullscreen();
                      $(document).trigger('fullscreen-enter');
                    }
                  });

                  $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function (e) {
                    if (!document.fullscreen && !document.mozFullScreen && !document.webkitIsFullScreen && !document.msFullscreenElement) {
                      $('canvas').removeAttr('style');
                      $('canvas').attr('width', canvas.width);
                      $('canvas').attr('height', canvas.height);
                      $(document).trigger('fullscreen-exit');
                    }
                  });

                  var draw = new d3Draw(map, racksList, nodesInfos, jobs);
                  draw.init(canvas.element);
                });
            })
        });
    };

    this.destroy = function () {
      $('#tabs a[href="#fullscreen"]').off('click');
      $('#tabs a[href="#camera"]').off('show.bs.tab');
      $(document).off('fullscreen-enter fullscreen-exit');
      $(document).off('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange');
      $(document).off('camera-change screen-change');
      $(document).trigger('three-destroy');
      $('#3d-view').remove();
    };

    return this;
  };
});
}
