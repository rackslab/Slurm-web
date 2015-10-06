define([
  'handlebars',
  'text!../config/config.json',
  'text!../config/2d.colors.config.json',
  'date-utils'
], function (Handlebars, config, colorsConfig, dateUtils) {
  config = JSON.parse(config);
  var colors = JSON.parse(colorsConfig);

  Handlebars.registerHelper('pickJobColor', function (jobId) {
    return colors.JOB[(jobId % colors.JOB.length)];
  })

  Handlebars.registerHelper('printCommand', function (command) {
    if (command === null) {
      return '-';
    }

    return command;
  });

  Handlebars.registerHelper('printStateReason', function (state) {
    if (state === 'None') {
      return '-';
    }

    return state;
  });

  Handlebars.registerHelper('printNodes', function (nodes) {
    if (nodes === null) {
      return '-';
    }

    if (nodes.length > config.MAXNODESLENGTH) {
      return (nodes.substring(0, config.MAXNODESLENGTH) + '...');
    }

    return nodes;
  });

  Handlebars.registerHelper('printReason', function (state, reason) {
    if (state === 'RUNNING' || state === 'COMPLETED') {
      return '-';
    }

    return reason;
  });

  Handlebars.registerHelper('printStartTime', function (timestamp, eligibleTimestamp, state) {
    if (state === 'PENDING' && timestamp > 0) {
      return 'within ' + dateUtils.getTimeDiff(timestamp * 1000);
    }

    if (state === 'PENDING' && !(new Date(eligibleTimestamp * 1000) < (new Date()))) {
      return 'within ' + dateUtils.getTimeDiff(eligibleTimestamp * 1000);
    }

    if (state === 'RUNNING') {
      return 'since ' + dateUtils.getTimeDiff(timestamp * 1000);
    }

    return '-';
  });
});
