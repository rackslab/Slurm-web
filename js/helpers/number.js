define([
  'handlebars'
], function (Handlebars) {
  Handlebars.registerHelper('fixInfiniteNumber', function (number) {
    var infinite = parseInt('0xffffffff', 16);
    var noValue = parseInt('0xfffffffe', 16);

    if (number === infinite || number === noValue) {
      return '-';
    }

    return number;
  });
});
