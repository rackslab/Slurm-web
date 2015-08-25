define(['handlebars'], function (Handlebars) {
  Handlebars.registerHelper('different', function (value) {
    return !value;
  });
});
