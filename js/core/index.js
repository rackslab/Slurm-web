require.config({
  paths: {
    text: '/javascript/requirejs/text.min',
    jquery: '/javascript/jquery/jquery.min',
    'jquery-tablesorter': '/javascript/jquery-tablesorter/jquery.tablesorter.min',
    'jquery-flot': '/javascript/jquery-flot/jquery.flot.min',
    'jquery-flot-pie': '/javascript/jquery-float/jquery.flot.pie.min',
    handlebars: '/javascript/handlebars/handlebars',
    bootstrap: '/javascript/bootstrap/js/bootstrap.min',
    cluster: '../../js/utils/cluster',
    token: '../../js/utils/token',
    date: '../../js/utils/date',
    number: '../../js/utils/number',
    page: '../../js/utils/page',
    navbar: '../../js/core/navbar/navbar',
    qos: '../../js/modules/qos/qos',
    reservations: '../../js/modules/reservations/reservations'
  },
  shim: {
    jquery: {
      exports: '$'
    },
    'jquery-tablesorter': {
      deps: [ 'jquery' ]
    },
    'jquery-flot': {
      deps: [ 'jquery' ]
    },
    'jquery-float-pie': {
      deps: [ 'jquery', 'jquery-float-pie' ]
    },
    handlebars: {
      exports: 'Handlebars'
    },
    bootstrap: {
      deps: [ 'jquery' ]
    }
  }
});

require(['cluster', 'page', 'text!config.json', 'qos', 'partitions', 'reservations', 'navbar'], function (Cluster, Page, config, QOS, Partitions, Reservations, Navbar) {
  var cluster = new Cluster();
  var navbar = new Navbar(cluster.getCluster());
  var page = new Page();

  config = JSON.parse(config);
  navbar.init();

  $(document).on('show', function (e, options) {
    e.stopPropagation();

    page.destroy();

    switch (options.page) {
    case 'jobs':
      break;
    case 'jobsmap':
      break;
    case 'partitions':
      $.extend(page,  new Page(), new Partitions());
      break;
    case 'qos':
      $.extend(page,  new Page(), new QOS());
      break;
    case 'racks':
      break;
    case 'reservations':
      $.extend(page,  new Page(), new Reservations());
      break;
    }

    page.init();
    page.refresh();
  });

  $(document).trigger('show', { page: config.firstPage });
});
