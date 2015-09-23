require.config({
  paths: {
    text: '/javascript/requirejs/text.min',
    jquery: '/javascript/jquery/jquery.min',
    'jquery-tablesorter': '/javascript/jquery-tablesorter/jquery.tablesorter.min',
    'jquery-flot': '/javascript/jquery-flot/jquery.flot.min',
    'jquery-flot-pie': '/javascript/jquery-flot/jquery.flot.pie.min',
    xdomain: '../../js/libraries/xdomain.min',
    handlebars: '/javascript/handlebars/handlebars',
    bootstrap: '/javascript/bootstrap/js/bootstrap',
    'bootstrap-typeahead': '../../js/libraries/typeahead/typeahead.jquery',
    three: '../../js/libraries/three.min',
    'bootstrap-tagsinput': '../../js/libraries/bootstrap-tagsinput/bootstrap-tagsinput.min',
    'helpers-utils': '../../js/utils/helpers',
    'cluster-utils': '../../js/utils/cluster',
    'string-utils': '../../js/utils/string',
    'token-utils': '../../js/utils/token',
    'user-utils': '../../js/utils/user',
    'date-utils': '../../js/utils/date',
    'number-utils': '../../js/utils/number',
    'array-utils': '../../js/utils/array',
    'boolean-utils': '../../js/utils/boolean',
    'tablesorter-utils': '../../js/utils/tablesorter',
    'jobs-utils': '../../js/utils/jobs',
    'racks-utils': '../../js/utils/racks',
    'draw-utils': '../../js/utils/draw',
    'nodes-utils': '../../js/utils/node',
    'page-utils': '../../js/utils/page',
    'ajax-utils': '../../js/utils/ajax',
    'factor-utils': '../../js/utils/factor',
    'flot-utils': '../../js/utils/flot',
    'keycode-utils': '../../js/utils/keycode',
    'tagsinput-utils': '../../js/utils/tagsinput',
    'draw-colors-utils': '../../js/utils/draw-colors',
    'draw-intersections-utils': '../../js/utils/draw-intersections',
    'draw-legend-utils': '../../js/utils/draw-legend',
    'draw-three-dimensional-utils': '../../js/utils/draw-three-dimensional',
    login: '../../js/core/login/login',
    navbar: '../../js/core/navbar/navbar',
    clusters: '../../js/core/clusters/clusters',
    jobs: '../../js/modules/jobs/jobs',
    racks: '../../js/modules/racks/racks',
    'jobs-map': '../../js/modules/jobs-map/jobs-map',
    partitions: '../../js/modules/partitions/partitions',
    qos: '../../js/modules/qos/qos',
    reservations: '../../js/modules/reservations/reservations',
    '3d-view': '../../js/modules/3d-view/3d-view',
    'three-first-person-controls': '../../js/modules/3d-view/camera/first-person-controls',
    'three-orbit-controls': '../../js/modules/3d-view/camera/orbit-controls',
    gantt: '../../js/modules/gantt/gantt'
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
    three: {
      exports: 'THREE'
    },
    bootstrap: {
      deps: [ 'jquery' ]
    },
    'bootstrap-typeahead': {
      deps: [ 'jquery' ],
      init: function ($) {
        return require.s.contexts._.registry['typeahead.js'].factory($);
      }
    },
    'bootstrap-tagsinput': {
      deps: [ 'jquery', 'bootstrap', 'bootstrap-typeahead' ]
    }
  }
});

var isIE = /*@cc_on!@*/false || !!document.documentMode;

if (isIE) {
  require(['xdomain'], function(xdomain){
    var slaves = {};
    for (var index in window.clusters) {
      slaves[window.clusters[index].api.url] = window.clusters[index].api.path + "/proxy";
    }
    xdomain.slaves(slaves);
  })
}

require([
  'page-utils',
  'text!config.json',
  'token-utils',
  'user-utils',
  'login',
  'navbar',
  'clusters',
  'jobs',
  'racks',
  'jobs-map',
  'qos',
  'partitions',
  'reservations',
  '3d-view',
  'gantt',
  'ajax-utils'
], function (Page, config, token, user, Login, Navbar, Clusters, Jobs, Racks, JobsMap, QOS, Partitions, Reservations, d3View, Gantt) {

  config = JSON.parse(config);
  var page = new Page();
  var clusters = new Clusters(config);
  clusters.init();

  $(document).on('loadPage', function(e, options) {
    e.stopPropagation();
    $(document).trigger('destroyNavbar');

    var navbar = new Navbar(options.config);
    navbar.init();

    $('title').html(options.config.cluster.name + '\'s HPC Dashboard');

    $(document).trigger('show', { page: options.config.firstPage });
  })

  $(document).on('logout', function (e) {
    e.preventDefault();

    $(document).trigger('show', { page: config.cluster.authentication.enabled ? 'login' : config.firstPage });
  });

  $(document).on('show', function (e, options) {
    e.stopPropagation();

    page.destroy();
    $('#flash').hide();

    switch (options.page) {
    case 'login':
      $.extend(page,  new Page('login'), new Login(config));
      break;
    case 'jobs':
      $.extend(page,  new Page('jobs'), new Jobs(config));
      break;
    case 'jobsmap':
      $.extend(page,  new Page('jobsmap'), new JobsMap(config));
      break;
    case 'partitions':
      $.extend(page,  new Page('partitions'), new Partitions(config));
      break;
    case 'qos':
      $.extend(page,  new Page('qos'), new QOS(config));
      break;
    case 'racks':
      $.extend(page,  new Page('racks'), new Racks(config));
      break;
    case 'reservations':
      $.extend(page,  new Page('reservations'), new Reservations(config));
      break;
    case '3dview':
      $.extend(page, new Page('3dview'), new d3View(config));
      break;
    case 'gantt':
      $.extend(page,  new Page('gantt'), new Gantt(config));
      break;
    }

    page.init();
    page.refresh();
  });

  $(document).trigger('loadPage', { config: config });
});
