define([], function () {
  return function () {
    var self = this;
    this.nodesIntersections = {};
    this.coresIntersections = {};

    $(document).on('canvas-click', function (e, options) {
      e.stopPropagation();
      var X = options.x;
      var Y = options.y;

      var index;
      var node;
      for (index in this.coresIntersections) {
        console.log(index)
        if (this.coresIntersections.hasOwnProperty(index)) {
          node = this.coresIntersections[index];
          console.log(node.XMIN, ' ', node.XMAX)
          return
          if (X >= node.XMIN && X <= node.XMAX && 
              Y >= node.YMIN && Y <= node.YMAX) {
            console.log('yeah !');
          }
        }
      };
    });
/*
    this.addNodeIntersections = function (name, XMIN, XMAX, YMIN, YMAX) {
      console.log(name, XMIN, XMAX, YMIN, YMAX);
    };
*/
    this.addCoreIntersections = function (infos, XMIN, XMAX, YMIN, YMAX) {
      if (typeof this.coresIntersections[infos.node + '-' + infos.core] !== 'array') {
        this.coresIntersections[infos.node + '-' + infos.core] = [];
      }

      this.coresIntersections[infos.node + '-' + infos.core].push({ 
        XMIN: XMIN,
        XMAX: XMAX,
        YMIN: YMIN,
        YMAX: YMAX
      });
    };

    this.isCoreIntersections = function (x, y) {
      var key = '';

      return key;
    };

    return this;
  };
});
