define([], function () {
  function percent(value, total) {
    return Math.round(value * 100 / total);
  }

  return {
    addPercentInLegend: function (tab) {
      var total = 0;

      var i;
      for (i = 0; i < tab.length; i++) {
        total += tab[i].data;
      }

      for (i = 0; i < tab.length; i++) {
        tab[i].label += ' (' + percent(tab[i].data, total) + '%)';
      }

      return tab;
    }
  };
});
