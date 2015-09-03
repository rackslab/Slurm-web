define(['jquery', 'handlebars', 'text!../../js/modules/first-person-view/first-person-view.hbs', 'draw-three-dimensional-utils'], function ($, Handlebars, template, DrawFirstPerson) {
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

      var draw = new DrawFirstPerson();
      draw.init($('canvas'));
    };

    this.refresh = function () {

    };

    this.destroy = function () {
      $('#3d-view').parent('.container-fluid').remove();
    };

    return this;
  };
});
