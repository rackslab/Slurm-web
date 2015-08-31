define(['jquery', 'handlebars', 'text!config.json', 'text!../../js/core/navbar/navbar.hbs', 'user-utils'], function ($, Handlebars, config, template, user) {
  config = JSON.parse(config);
  template = Handlebars.compile(template);

  return function () {
    var self = this;
    this.userLogged = true;

    $(document).on('logged', function (e) {
      e.preventDefault();

      self.userLogged = true;
      self.destroy();
      self.init();
    });

    $(document).on('logout', function (e) {
      e.preventDefault();

      self.userLogged = false;
      self.destroy();
      self.init();
    });

    this.init = function () {
      var context = {
        clusterName: config.clusterName + '\'s Slurm HPC Dashboard',
        userLogged: this.userLogged,
        user: $(user.getUser(), { username: '' })
      };

      $('body').prepend(template(context));

      $("#navbar > ul > li > a[id^='menu-']").each(function () {
        $(this).click(function (e) {
          e.preventDefault();
          $(document).trigger('show', { page: e.target.id.split('-')[1] });
        });
      });

      $('#logout').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $(document).trigger('logout');
      });
    };

    this.destroy = function () {
      $('#navbar').parent('nav').remove();
    };
  };
});
