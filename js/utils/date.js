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

  return {
    isDST: function () {
      var date = new Date();
      var jan = new Date(date.getFullYear(), 0, 1);
      var jul = new Date(date.getFullYear(), 6, 1);
      return (Math.min(jan.getTimezoneOffset(), jul.getTimezoneOffset()) === date.getTimezoneOffset());
    },

    getTimeDiff: function (datetime) {
      var date = new Date().getTime();

      if (isNaN(datetime)) {
        return "";
      }

      var diff = Math.abs(datetime - date) - (this.isDST() ? 60 * 60 * 1000 : 0);

      var days = Math.floor(diff / 1000 / 60 / (60 * 24));
      var dateDiff = new Date(diff);

      return ((days <= 0 ? "" : days + "d ")
          + (dateDiff.getHours() === 0 ? "" : dateDiff.getHours() + "h ")
          + (dateDiff.getMinutes() === 0 ? "" : dateDiff.getMinutes() + "min ")
          + (dateDiff.getSeconds() === 0 ? "" : dateDiff.getSeconds() + "s"));
    }
  };
});
