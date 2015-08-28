require.config({
  paths: {
    text: '/javascript/requirejs/text.min',
    jquery: '/javascript/jquery/jquery.min',
    'jquery-tablesorter': '/javascript/jquery-tablesorter/jquery.tablesorter.min',
    'jquery-flot': '/javascript/jquery-flot/jquery.flot.min',
    'jquery-flot-pie': '/javascript/jquery-flot/jquery.flot.pie.min',
    handlebars: '/javascript/handlebars/handlebars',
    bootstrap: '/javascript/bootstrap/js/bootstrap.min',
    'helpers-utils': '../../js/utils/helpers',
    'cluster-utils': '../../js/utils/cluster',
    'token-utils': '../../js/utils/token',
    'date-utils': '../../js/utils/date',
    'number-utils': '../../js/utils/number',
    'array-utils': '../../js/utils/array',
    'boolean-utils': '../../js/utils/boolean',
    'tablesorter-utils': '../../js/utils/tablesorter',
    'jobs-utils': '../../js/utils/jobs',
    'draw-utils': '../../js/utils/draw',
    'nodes-utils': '../../js/utils/node',
    'page-utils': '../../js/utils/page',
    'ajax-utils': '../../js/utils/ajax',
    'draw-intersections-utils': '../../js/utils/draw-intersections',
    login: '../../js/core/login/login',
    navbar: '../../js/core/navbar/navbar',
    jobs: '../../js/modules/jobs/jobs',
    racks: '../../js/modules/racks/racks',
    'jobs-map': '../../js/modules/jobs-map/jobs-map',
    partitions: '../../js/modules/partitions/partitions',
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
    'jquery-flot-pie': {
      deps: [ 'jquery', 'jquery-flot' ]
    },
    handlebars: {
      exports: 'Handlebars'
    },
    bootstrap: {
      deps: [ 'jquery' ]
    }
  }
});

require(['cluster-utils', 'page-utils', 'text!config.json', 'login', 'navbar', 'jobs', 'racks', 'jobs-map', 'qos', 'partitions', 'reservations', 'ajax-utils'], function (Cluster, Page, config, Login, Navbar, Jobs, Racks, JobsMap, QOS, Partitions, Reservations) {
  var cluster = new Cluster();
  var navbar = new Navbar(cluster.getCluster());
  var page = new Page();

  config = JSON.parse(config);
  navbar.init();

  $(document).on('show', function (e, options) {
    e.stopPropagation();

    page.destroy();

    switch (options.page) {
    case 'login':
      if (options.page === page.getPageName()) {
        return;
      }
      $.extend(page, new Page(), new Login());
      break;
    case 'jobs':
      $.extend(page,  new Page('jobs'), new Jobs(cluster));
      break;
    case 'jobsmap':
      $.extend(page,  new Page('jobsmap'), new JobsMap());
      break;
    case 'partitions':
      $.extend(page,  new Page('partitions'), new Partitions());
      break;
    case 'qos':
      $.extend(page,  new Page('qos'), new QOS());
      break;
    case 'racks':
      $.extend(page,  new Page('racks'), new Racks());
      break;
    case 'reservations':
      $.extend(page,  new Page('reservations'), new Reservations());
      break;
    }

    page.init();
    page.refresh();
  });

  $(document).trigger('show', { page: config.firstPage });
});
