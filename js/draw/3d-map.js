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
], function (config) {
  config = JSON.parse(config);

  function findRangeNumber(racks) {
    var number = 0;

    var indexRange;
    var indexRack;
    for (indexRange in racks) {
      if (racks.hasOwnProperty(indexRange)) {
        for (indexRack in racks[indexRange]) {
          if (racks[indexRange].hasOwnProperty(indexRack)) {
            if (racks[indexRange][indexRack].hasOwnProperty('posx') && number < racks[indexRange][indexRack].posx) {
              number = racks[indexRange][indexRack].posx;
            }
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

  function printMap(map) {
    var tab = [];
    var i;
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

  function findRangeMaxRacksNumber(racks) {
    var number = 0;

    var index;
    for (index in racks) {
      if (racks.hasOwnProperty(index)) {
        if (Object.keys(racks[index]).length > number) {
          number = Object.keys(racks[index]).length;
        }
      }
    }

    return number;
  }

  function findMapAltitude(racks) {
    var altitude = 0;
    var rackAltitude;

    var rackIndex;
    var nodeIndex;
    var i;
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
    var walls = [];

    var i;
    for (i = 0; i < max + 2 + (config.PATHSIZE * 2) * 2; i++) {
      walls.push(1);
    }

    return walls;
  }

  function getMapPathX(max) {
    var paths = [];

    paths.push(1);

    var i;
    for (i = 0; i < max + (config.PATHSIZE * 2) * 2; i++) {
      paths.push(0);
    }

    paths.push(1);

    return paths;
  }

  function getRacksFromPosX(posx, racks) {
    var indexRange;
    var indexRack;
    for (indexRange in racks) {
      if (racks.hasOwnProperty(indexRange)) {
        for (indexRack in racks[indexRange]) {
          if (racks[indexRange].hasOwnProperty(indexRack)) {
            if (racks[indexRange][indexRack].hasOwnProperty('posx') && racks[indexRange][indexRack].posx === posx) {
              return racks[indexRange];
            }
          }
        }
      }
    }

    return {};
  }

  function getMapRangeX(posx, max, env) {
    var racks = getRacksFromPosX(posx, env);
    var rangeMap = [];
    var range = [];

    rangeMap.push(1);
    var i;
    for (i = 0; i < config.PATHSIZE * 2; i++) {
      rangeMap.push(0);
    }

    i = 0;
    var index;
    var pos;
    for (index in racks) {
      if (racks.hasOwnProperty(index) && racks[index].hasOwnProperty('name')) {
        pos = racks.length;
        if (racks[index].hasOwnProperty('posy')) {
          pos = racks[index].posy;
        }

        range.push({ name: racks[index].name, position: pos });
        i++;
      }
    }

    range.sort(function (a, b) {
      if (a.position < b.position) {
        return -1;
      }
      if (a.position > b.position) {
        return 1;
      }
      return 0;
    });

    var k;
    for (var k = 0; k < range.length; k++) {
      rangeMap.push(range[k].name);
    }

    if (i < max) {
      for (; i < max; i++) {
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
    racksToMap: function (racks) {
      var map = {
        data: [],
        width: 0,
        height: 0,
        altitude: 0
      };

      var rangeNumber = findRangeNumber(racks);
      var rangeMaxRacksNumber = findRangeMaxRacksNumber(racks);

      var i;
      map.data = map.data.concat(getMapWallX(rangeMaxRacksNumber));
      for (i = 0; i < config.PATHSIZE * 2; i++) {
        map.data = map.data.concat(getMapPathX(rangeMaxRacksNumber));
      }

      var hotRange = true;
      var k;
      for (k = 0; k < rangeNumber; k++) {
        map.data = map.data.concat(getMapRangeX(k, rangeMaxRacksNumber, racks));
        if (hotRange) {
          for (i = 0; i < config.PATHSIZE; i++) {
            map.data = map.data.concat(getMapPathX(rangeMaxRacksNumber));
          }
          hotRange = false;
        } else {
          hotRange = true;
        }
      }

      for (i = 0; i < config.PATHSIZE * 2; i++) {
        map.data = map.data.concat(getMapPathX(rangeMaxRacksNumber));
      }

      map.data = map.data.concat(getMapWallX(rangeMaxRacksNumber));

      map.width = rangeMaxRacksNumber + 2 + (config.PATHSIZE * 2) * 2;
      map.height = map.data.length / map.width;
      map.altitude = findMapAltitude(racks);
      map.rangeMaxRacksNumber = rangeMaxRacksNumber;
      map.rangeNumber = rangeNumber;

      return map;
    }
  }
});
