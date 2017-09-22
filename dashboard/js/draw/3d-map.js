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

define([
  'text!/slurm-web-conf/3d.config.json'
], function(config) {
  config = JSON.parse(config);

  function findRangeNumber(racks) {
    var indexRange, indexRack,
      number = 0;

    for (indexRange in racks) {
      if (racks.hasOwnProperty(indexRange)) {
        for (indexRack in racks[indexRange]) {
          if (
            racks[indexRange].hasOwnProperty(indexRack) &&
            racks[indexRange][indexRack].hasOwnProperty('posx') &&
            number < racks[indexRange][indexRack].posx
          ) {
            number = racks[indexRange][indexRack].posx;
          }
        }
      }
    }

    if (number < racks.length) {
      number = racks.length;
    }

    if (number % 2) {
      number++;
    }

    return number;
  }

  // useful for debug
  /* eslint-disable no-console, no-unused-vars */
  function printMap(map) {
    var tab = [], i;

    for (i = 0; i < map.data.length; i++) {
      if (i % map.width === 0) {
        console.log(tab.toString());
        console.log('\n');
        tab = [];
      }
      tab.push(map.data[i]);
    }

    console.log(tab.toString());
  }
  /* eslint-enable no-console */

  function findRangeMaxRacksNumber(racks) {
    var number = 0, index;

    for (index in racks) {
      if (racks.hasOwnProperty(index)) {
        // For each row get the biggest posy
        var indexMax = Object.keys(racks[index])
            .map(function(k){return racks[index][k].posy})
            .sort().reverse()[0];
        // Find the biggest posy value among all rows
        if (indexMax > number) {
          number = indexMax;
        }
        // Use length in case when the biggest posy is zero
        if (Object.keys(racks[index]).length > number) {
          number = Object.keys(racks[index]).length;
        }
      }
    }

    return number;
  }
  function findRangeMinRacksNumber(racks) {
    var number = 10000000, index;

    for (index in racks) {
      if (racks.hasOwnProperty(index)) {
        // For each row get the smallest posy
        var indexMin = Object.keys(racks[index])
            .map(function(k){return racks[index][k].posy})
            .sort()[0];
        // Find the biggest posy value among all rows
        if (indexMin < number) {
          number = indexMin;
        }
      }
    }
    return number;
  }

  function findMapAltitude(racks) {
    var altitude = 0, rackAltitude, rackIndex, nodeIndex, i;

    for (rackIndex in racks) {
      if (racks.hasOwnProperty(rackIndex)) {
        for (nodeIndex in racks[rackIndex]) {
          if (racks[rackIndex].hasOwnProperty(nodeIndex) && racks[rackIndex][nodeIndex].hasOwnProperty('nodes')) {
            for (i = 0; i < racks[rackIndex][nodeIndex].nodes.length; i++) {
              rackAltitude = racks[rackIndex][nodeIndex].nodes[i].posy + racks[rackIndex][nodeIndex].nodes[i].height;
              if (rackAltitude > altitude) {
                altitude = rackAltitude;
              }
            }
          }
        }
      }
    }

    return altitude;
  }

  function getMapWallX(max) {
    var i,
      walls = [];

    for (i = 0; i < max + 2 + config.PATHSIZE * 2 * 2; i++) {
      walls.push(1);
    }

    return walls;
  }

  function getMapPathX(max) {
    var i,
      paths = [];

    paths.push(1);

    for (i = 0; i < max + config.PATHSIZE * 4; i++) {
      paths.push(0);
    }

    paths.push(1);
    return paths;
  }

  function getRacksFromPosX(posx, racks) {
    var indexRange, indexRack;

    for (indexRange in racks) {
      if (racks.hasOwnProperty(indexRange)) {
        for (indexRack in racks[indexRange]) {
          if (
            racks[indexRange].hasOwnProperty(indexRack) &&
            racks[indexRange][indexRack].hasOwnProperty('posx') &&
            racks[indexRange][indexRack].posx === posx
          ) {
            return racks[indexRange];
          }
        }
      }
    }

    return {};
  }

  function getMapRangeX(posx, max, min, env) {
    var i, k, index, pos,
      racks = getRacksFromPosX(posx, env),
      rangeMap = [],
      range = [];

    rangeMap.push(1);

    for (i = 0; i < config.PATHSIZE * 2; i++) {
      rangeMap.push(0);
    }

    for (index in racks) {
      if (racks.hasOwnProperty(index) && racks[index].hasOwnProperty('name')) {
        pos = racks.length;
        if (racks[index].hasOwnProperty('posy')) {
          pos = racks[index].posy;
        }

        range.push({ name: racks[index].name, position: pos });
      }
    }

    for (k = min; k <= max; k++) {
      var positionedRange = null;
      for (r in range) {
        if (range[r].position === k) {
          positionedRange = range[r];
        }
      }
      // If there's a rack, add it to the current position
      if (positionedRange) {
        rangeMap.push(positionedRange.name);
      }
      else {
        rangeMap.push(0);
      }
    }

    for (i = 0; i < config.PATHSIZE * 2; i++) {
      rangeMap.push(0);
    }
    rangeMap.push(1);

    return rangeMap;
  }

  return {
    racksToMap: function(racks) {
      var i, k,
        rangeNumber = findRangeNumber(racks),
        rangeMaxRacksNumber = findRangeMaxRacksNumber(racks),
        rangeMinRacksNumber = findRangeMinRacksNumber(racks),
        // Get the space width for rack zone
        rangeDiff = rangeMaxRacksNumber - rangeMinRacksNumber + 1,
        hotRange = true,
        map = {
          data: [],
          width: 0,
          height: 0,
          altitude: 0
        };

      map.data = map.data.concat(getMapWallX(rangeDiff));
      for (i = 0; i < config.PATHSIZE * 2; i++) {
        map.data = map.data.concat(getMapPathX(rangeDiff));
      }

      for (k = 0; k < rangeNumber; k++) {
        map.data = map.data.concat(getMapRangeX(k, rangeMaxRacksNumber, rangeMinRacksNumber, racks));
        if (hotRange) {
          for (i = 0; i < config.PATHSIZE; i++) {
            map.data = map.data.concat(getMapPathX(rangeDiff));
          }
          hotRange = false;
        } else {
          hotRange = true;
        }
      }

      for (i = 0; i < config.PATHSIZE * 2; i++) {
        map.data = map.data.concat(getMapPathX(rangeDiff));
      }

      map.data = map.data.concat(getMapWallX(rangeDiff));

      map.width = rangeDiff + 2 + config.PATHSIZE * 4;
      map.height = map.data.length / map.width;
      map.altitude = findMapAltitude(racks);
      map.rangeMaxRacksNumber = rangeDiff;
      map.rangeNumber = rangeNumber;

      return map;
    }
  };
});
