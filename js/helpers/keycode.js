define([
  'handlebars'
], function (Handlebars) {
  Handlebars.registerHelper('fromCharCode', function (value) {
    return String.fromCharCode(value);
  });
});
