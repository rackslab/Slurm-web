define([], function () {
  return function () {
    this.nodesIntersections = {};
    this.CoresIntersections = {};

    $(document).on('canvas-click', function (e, options) {
      e.stopPropagation();

      console.log(options);
    });

    this.addNodeIntersections = function (name, XMIN, XMAX, YMIN, YMAX) {
      console.log(name, XMIN, XMAX, YMIN, YMAX);
    };

    this.addCoreIntersections = function (name, XMIN, XMAX, YMIN, YMAX) {
      console.log(name, XMIN, XMAX, YMIN, YMAX);
    };

    this.isNodesIntersections = function (x, y) {
      var key = '';

      return key;
    };

    return this;
  };
});
