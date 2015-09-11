define([], function () {
  function factors(number) {
    var nFactors = [];

    var i;
    for (i = 1; i <= Math.floor(Math.sqrt(number)); i++)

    if ((number % i) === 0){
      nFactors.push([ i, (number / i) ]);
    }

    nFactors.sort(function (a, b) {
      return a[0] - b[0];
    });

    return nFactors;
  }

  return {
    bestFactor: function (nodeWidth, nodeHeight, cpus) {
      var allFactors = factors(cpus);
      var goalRatio = (nodeWidth - 20) / (nodeHeight - 4);
      var ratio = -1;
      var bestRatio = -1;
      var bestFactorId = 0;

      var i;
      for (i = 0; i < allFactors.length; i++) {
        ratio = allFactors[i][1] / allFactors[i][0];

        if (Math.abs(ratio - goalRatio) < Math.abs(bestRatio - goalRatio)) {
          bestRatio = ratio;
          bestFactorId = i;
        }
      }

      return allFactors[bestFactorId];
    }
  };
});
