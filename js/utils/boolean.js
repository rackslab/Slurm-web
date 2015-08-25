define(['handlebars'], function (Handlebars) {
  Handlebars.registerHelper('yesOrNo', function (item) {
    if (item === 1) {
      return 'Yes';
    }

    return 'No';
  });
});
