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
], function ($, Handlebars, template, token, d3Draw, d3MapDraw, jobsUtils) {
  template = Handlebars.compile(template);

  return function (config) {

    this.init = function () {
      $('#main').append(template());

      $('#tabs a[href="#camera"]').on('show.bs.tab', function (e) {
        $(document).trigger('camera-change', { cameraType: $(this).attr('aria-controls')});
      });

      var canvas = {
        element: $('canvas')[0],
        width: $('canvas').parent('div').width(),
        height: $(window).innerHeight() - 
          $('canvas').parent('div').offset().top - 
          (parseInt($('#main').css('paddingTop').replace(/[^-\d\.]/g, '')) + parseInt($('#main').css('paddingBottom').replace(/[^-\d\.]/g, '')))
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
