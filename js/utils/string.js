define(['handlebars'], function (Handlebars) {
  Handlebars.registerHelper('capitalize', function (item) {
    return (item.charAt(0).toUpperCase() + item.slice(1));
  });
});
