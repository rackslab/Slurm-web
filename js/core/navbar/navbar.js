define(['jquery', 'handlebars', 'text!../../js/core/navbar/navbar.hbs', 'user-utils', 'boolean-utils', 'string-utils'], function ($, Handlebars, template, user, token) {
  template = Handlebars.compile(template);

  return function (config) {
    var self = this;
    this.userLogged = true;

    $(document).on('logout', function (e) {
      e.preventDefault();

      self.userLogged = false;
      self.destroy();
      self.init();
    });

    $(document).on('logged', function (e) {
      self.userLogged = true;
      self.destroy();
      self.init();
    });

    $(document).on('destroyNavbar', function (e) {
      self.destroy();
    });

    this.init = function () {
      var context = {
        clusterName: config.cluster.name + '\'s Slurm HPC Dashboard',
        userLogged: this.userLogged,
        user: $.extend({ username: '' }, user.getUser(config.cluster))
      };

      $('body').prepend(template(context));

      $("#navbar > ul > li > a[id^='menu-']").on('click', function (e) {
        e.preventDefault();
        $(document).trigger('show', { page: e.target.id.split('-')[1] });
      });

      $('#menu-logout').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        $(document).trigger('logout', { cluster: config.cluster });
      });

      $(document).trigger('navbarLoaded', { height: $('#navbar').height() });
    };

    this.destroy = function () {
      $("#navbar > ul > li > a[id^='menu-']").off('click');
      $('#menu-logout').off('click');
      $('nav:first-child').remove();
    };
  };
});
