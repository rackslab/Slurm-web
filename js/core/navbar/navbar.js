define(['jquery', 'handlebars', 'text!../../js/core/navbar/navbar.hbs'], function ($, Handlebars, template) {
  template = Handlebars.compile(template);

  return function (cluster) {
    this.init = function () {
      var context = {
        cluster: cluster
      };

      $('body').append(template(context));

      $('#navbar a').each(function () {
        $(this).click(function (e) {
          e.preventDefault();
          $(document).trigger('show', { page: e.target.id.split('-')[1] });
        });
      });
    };

    this.destroy = function () {
      $('#navbar').parent('nav').remove();
    };
  };
});
