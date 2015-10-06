define([
  'handlebars'
], function (Handlebars) {
  Handlebars.registerHelper('join', function (item, separator) {
    return item.join(separator);
  });
});
