define(['text!config.json'], function (config) {
  config = JSON.parse(config);

  function findRangeMaxRacksNumber(racks) {
    var number = 0;

    var index;
    for (index in racks) {
      if (Object.keys(racks[index]).length > number) {
        number = Object.keys(racks[index]).length;
      }
    }

    return number;
  }

  function getMapWallX(max) {
    var walls = [];

    var i;
    for (i = 0; i < max + 2 + (config.display.canvas3d.pathSize * 2); i++) {
      walls.push(1);
    }

    return walls;
  }

  function getMapPathX(max) {
    var paths = [];

    paths.push(1);

    var i;
    for (i = 0; i < max + (config.display.canvas3d.pathSize * 2); i++) {
      paths.push(0);
    }

    paths.push(1)

    return paths;
  }

  function getMapRangeX(rack, max) {
    var range = [];

    range.push(1);
    var i;
    for (i = 0; i < config.display.canvas3d.pathSize; i++) {
      range.push(0);
    }

    i = 0;
    for (var index in rack) {
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

    for (i = 0; i < config.display.canvas3d.pathSize; i++) {
      range.push(0);
    }
    range.push(1);

    return range;
  }

  return {
    racksToMap: function (racks) {
      var map = [];
      var rangeNumber = racks.length;
      var rangeMaxRacksNumber = findRangeMaxRacksNumber(racks);

      var index;
      var i;
      map.push(getMapWallX(rangeMaxRacksNumber));
      for (i = 0; i < config.display.canvas3d.pathSize; i++) {
        map.push(getMapPathX(rangeMaxRacksNumber));
      }
      for (index in racks) {
        map.push(getMapRangeX(racks[index], rangeMaxRacksNumber))
        for (i = 0; i < config.display.canvas3d.pathSize; i++) {
          map.push(getMapPathX(rangeMaxRacksNumber));
        }
      }
      map.push(getMapWallX(rangeMaxRacksNumber));

      return map;
    }
  }
});
