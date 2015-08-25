define(['jquery'], function ($) {
  return {
    findTablesorterOptions: function (selector) {
      var options = {
        sortList: []
      };

      $(selector + ' thead tr th').each(function (index, item) {
        if ($(item).hasClass('headerSortUp')) {
          options.sortList.push([index, 1]);
        }
        if ($(item).hasClass('headerSortDown')) {
          options.sortList.push([index, 0]);
        }
      });

      return options;
    }
  };
});
