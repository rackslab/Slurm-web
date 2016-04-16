/*
 * Copyright (C) 2015 EDF SA
 *
 * This file is part of slurm-web.
 *
 * slurm-web is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * slurm-web is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

define([], function() {
  function factors(number) {
    var i,
      nFactors = [];

    for (i = 1; i <= Math.floor(Math.sqrt(number)); i++) {
      if (number % i === 0) {
        nFactors.push([ i, number / i ]);
      }
    }

    nFactors.sort(function(a, b) {
      return a[0] - b[0];
    });

    return nFactors;
  }

  return {
    bestFactor: function(nodeWidth, nodeHeight, cpus) {
      var i,
        allFactors = factors(cpus),
        goalRatio = nodeWidth / nodeHeight,
        ratio = -1,
        bestRatio = -1,
        bestFactorId = 0;

      if (cpus === 0) {
        return [ null, null ];
      }

      for (i = 0; i < allFactors.length; i++) {
        ratio = allFactors[i][1] / allFactors[i][0];

        if (Math.abs(ratio - goalRatio) < Math.abs(bestRatio - goalRatio)) {
          bestRatio = ratio;
          bestFactorId = i;
        }
      }

      return goalRatio < 1
        ? allFactors[bestFactorId].reverse()
        : allFactors[bestFactorId];
    }
  };
});
