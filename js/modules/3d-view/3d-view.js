define(['jquery', 'handlebars', 'text!../../js/modules/3d-view/3d-view.hbs', 'token-utils', 'draw-three-dimensional-utils', 'racks-utils', 'jobs-utils'], function ($, Handlebars, template, token, d3Draw, racksUtils, jobsUtils) {
  template = Handlebars.compile(template);

  return function (config) {

    this.init = function () {
      $('body').append(template());

      var canvas = {
        width: $(window).width() - $('canvas').offset().left * 2,
        height: $(window).height() - $('canvas').offset().top
      };

      $('canvas').attr('width', canvas.width);
      $('canvas').attr('height', canvas.height);

      var options = {
        type: 'POST',
        dataType: 'json',
        crossDomain: true,
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

                  var draw = new d3Draw(map, racksList, nodesInfos, jobs);
                  draw.init($('canvas'));
                });
            })
        });
    };

    this.refresh = function () {

    };

    this.destroy = function () {
      $('#3d-view').parent('.container-fluid').remove();
    };

    return this;
  };
});
