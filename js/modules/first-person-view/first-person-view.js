define(['jquery', 'handlebars', 'text!config.json', 'text!../../js/modules/first-person-view/first-person-view.hbs', 'token-utils', 'draw-three-dimensional-utils', 'racks-utils', 'jobs-utils'], function ($, Handlebars, config, template, token, DrawFirstPerson, racksUtils, jobsUtils) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);

  return function () {

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
          token: token.getToken()
        })
      };

      $.ajax(config.apiURL + config.apiPath + '/racks', options)
        .success(function(racks) {
          $.ajax(config.apiURL + config.apiPath + '/jobs', options)
            .success(function (jobs) {
              jobs = jobsUtils.buildAllocatedCPUs(jobs));

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

              var draw = new DrawFirstPerson(map, racksList, jobs);
              draw.init($('canvas'));
            });
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
