define(['handlebars'], function (Handlebars) {
  Handlebars.registerHelper('yesOrNo', function (item) {
    if (item === 1) {
      return 'Yes';
    }

    return 'No';
  });

  Handlebars.registerHelper('isTrue', function (item) {
    if (item) {
      return 1;
    }

    return 0;
  });
});
