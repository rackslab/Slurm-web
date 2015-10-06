define([
  'jquery'
], function ($) {
  return {
    eraseEmptyColumn: function (selector) {
      var totalRow = $(selector + ' tbody tr').length;
      var tabInfos = {};
      var removable = [];

      $(selector + ' tbody tr').each(function (indexTr, itemTr) {
        $(itemTr).children('td').each(function (indexTd, itemTd) {
          if (!tabInfos.hasOwnProperty(indexTd)) {
            tabInfos[indexTd] = 0;
          }

          if (['-', ''].indexOf($(itemTd).text()) + 1) {
            tabInfos[indexTd]++;
          }
        });
      });

      var index;
      for (index in tabInfos) {
        if (tabInfos.hasOwnProperty(index)) {
          if (tabInfos[index] === totalRow) {
            $(selector + ' thead tr').each(function (indexTr, itemTr) {
              removable.push($(itemTr).children('th')[index]);
            });

            $(selector + ' tbody tr').each(function (indexTr, itemTr) {
              removable.push($(itemTr).children('td')[index]);
            });
          }
        }
      }

      var i;
      for (i = 0; i < removable.length; i++) {
        $(removable[i]).remove();
      }
    },
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
