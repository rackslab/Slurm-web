define([
  'handlebars'
], function (Handlebars) {
  Handlebars.registerHelper('printDateFromTimestamp', function (timestamp) {
    return timestamp ? (new Date(timestamp * 1000)).toLocaleString() : '-';
  });

  Handlebars.registerHelper('minutesToDelay', function (minutes) {
    if (isNaN(minutes)) {
      return minutes;
    }

    var days = Math.floor(minutes / 1440);
    minutes -= days * 1440;
    var hours = Math.floor(minutes / 60) % 24;
    minutes -= hours * 60;

    return ((days === 0 ? '' : days + 'd ')
        + (hours === 0 ? '' : hours + 'h ')
        + (minutes === 0 ? '' : minutes + 'm'));
  });
});
