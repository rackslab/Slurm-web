define(['text!../config/3d.config.json'], function (config) {
  config = JSON.parse(config);

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
          if (racks[rackIndex][nodeIndex]) {
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
    for (i = 0; i < max + 2 + (config.PATHSIZE * 2); i++) {
      walls.push(1);
    }

    return walls;
  }

  function getMapPathX(max) {
    var paths = [];

    paths.push(1);

    var i;
    for (i = 0; i < max + (config.PATHSIZE * 2); i++) {
      paths.push(0);
    }

    paths.push(1);

    return paths;
  }

  function getMapRangeX(rack, max) {
    var range = [];

    range.push(1);
    var i;
    for (i = 0; i < config.PATHSIZE; i++) {
      range.push(0);
    }

    i = 0;
    var index;
    for (index in rack) {
      if (rack.hasOwnProperty(index)) {
        range.push(rack[index].name)
      }
      i++;
    }

    if (i < max) {
      for (; i < max; i++) {
        range.push(0);
      }
    }

    for (i = 0; i < config.PATHSIZE; i++) {
      range.push(0);
    }
    range.push(1);

    return range;
  }

  return {
    racksToMap: function (racks) {
      var map = {
        data: [],
        width: 0,
        height: 0,
        altitude: 0
      };

      var rangeNumber = racks.length;
      var rangeMaxRacksNumber = findRangeMaxRacksNumber(racks);

      var index;
      var i;
      map.data = map.data.concat(getMapWallX(rangeMaxRacksNumber));
      for (i = 0; i < config.PATHSIZE; i++) {
        map.data = map.data.concat(getMapPathX(rangeMaxRacksNumber));
      }

      for (index in racks) {
        map.data = map.data.concat(getMapRangeX(racks[index], rangeMaxRacksNumber))
        for (i = 0; i < config.PATHSIZE; i++) {
          map.data = map.data.concat(getMapPathX(rangeMaxRacksNumber));
        }
      }

      map.data = map.data.concat(getMapWallX(rangeMaxRacksNumber));

      map.width = rangeMaxRacksNumber + 2 + (config.PATHSIZE * 2);
      map.height = map.data.length / map.width;
      map.altitude = findMapAltitude(racks);

      return map;
    }
  }
});
