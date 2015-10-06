define([
  'jquery',
  'text!../config/2d.config.json',
  'text!../config/2d.colors.config.json',
  '2d-intersections-draw',
  'colors-draw'
], function ($, d2Config, d2ColorsConfig, IntersectionsDraw, colorsDraw) {
  var config = JSON.parse(d2Config);
  var colors = JSON.parse(d2ColorsConfig);
  var canvasConfig = config.CANVAS;

  return function() {
    var self = this;
    this.intersections = null;
    this.config = $.extend(config.CANVAS, {
      RACKINSIDEHEIGHT: canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT,
      RACKHEIGHT: (canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT) + (2 * canvasConfig.RACKBORDERWIDTH),
      RACKWIDTH: canvasConfig.RACKINSIDEWIDTH + (2 * canvasConfig.RACKBORDERWIDTH),
      CANVASHEIGHT: (canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT) + (2 * canvasConfig.RACKBORDERWIDTH) + canvasConfig.CANVASMARGINTOP,
      NODESPERCOL: Math.floor(canvasConfig.NODESPERRACK / canvasConfig.NODESPERROW),
      NODEWIDTH: Math.floor(((canvasConfig.RACKINSIDEWIDTH + (2 * canvasConfig.RACKBORDERWIDTH)) - (2 * canvasConfig.RACKBORDERWIDTH) - ((canvasConfig.NODESPERROW * canvasConfig.NODEMARGIN) + canvasConfig.NODEMARGIN)) / canvasConfig.NODESPERROW),
      NODEHEIGHT: Math.floor(((canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT) + (2 * canvasConfig.RACKBORDERWIDTH) - (2 * canvasConfig.RACKBORDERWIDTH) - ((canvasConfig.NODESPERCOL * canvasConfig.NODEMARGIN) + canvasConfig.NODEMARGIN)) / canvasConfig.NODESPERCOL),
      NODESTATEHEIGHT: Math.floor(((canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT) + (2 * canvasConfig.RACKBORDERWIDTH) - (2 * canvasConfig.RACKBORDERWIDTH) - ((canvasConfig.NODESPERCOL * canvasConfig.NODEMARGIN) + canvasConfig.NODEMARGIN)) / canvasConfig.NODESPERCOL)
    });

    function getRackABSCoordinates() {
      var X = 0;
      var Y = 0;

      var ABSX = self.config.LEFTMARGIN + (X * (self.config.RACKWIDTH + self.config.RACKHORIZONTALMARGIN));
      var ABSY = self.config.TOPMARGIN + (Y * (self.config.RACKHEIGHT + self.config.RACKVERTICALMARGIN));

      return {
        X: ABSX,
        Y: ABSY
      };
    }

    function drawRectangle(ctx, x, y, width, height, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }

    function drawRectangleBorder(ctx, X, Y, width, height, borderWidth, colorFill, colorBorder) {
      ctx.beginPath();
      ctx.rect(X - 0.5, Y - 0.5, width, height);
      ctx.fillStyle = colorFill;
      ctx.fill();
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = colorBorder;
      ctx.stroke();
    }

    function drawLed(ctx, x, y, color) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
    }

    function factors(number) {
      var nFactors = []

      var i = 0;
      for (i = 1; i <= Math.floor(Math.sqrt(number)); i++)
      if (number % i === 0) {
        nFactors.push([ i, (number / i) ]);
      }

      nFactors.sort(function (a, b) {
        return a[0] - b[0];
      });

      return nFactors;
    }

    function bestFactor(nodeWidth, nodeHeight, coresNumber) {
      if (coresNumber == 0) {
          return [ null, null ];
      }

      var allFactors = factors(coresNumber)
      var goalRatio = (self.config.NODEWIDTH - 20) / (self.config.NODEHEIGHT - 4);
      var ratio = -1;
      var bestRatio = -1;
      var bestFactorId = 0;

      for (var i = 0; i < allFactors.length; i++) {
        ratio = allFactors[i][1] / allFactors[i][0];

        if (Math.abs(ratio - goalRatio) < Math.abs(bestRatio - goalRatio)) {
          bestRatio = ratio;
          bestFactorId = i;
        }
      }

      return allFactors[bestFactorId];
    }

    function pickJobColor(jobId) {
      return colors.JOB[(jobId % colors.JOB.length)];
    }

    function getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize) {
      var coreX = Math.floor(coreId / coresRows);
      var coreY = Math.floor(coreId % coresRows);

      var coreXOrigin = (nodeABSX + nodeWidth) - (coresColumns * coreSize) - 2;
      var coreYorigin = nodeABSY + Math.round((nodeHeight - (coresRows * coreSize)) / 2);
      var coreABSX = coreXOrigin + (coreX * coreSize);
      var coreABSY = coreYorigin + (coreY * coreSize);

      return { x: coreABSX, y: coreABSY };
    }

    function writeNodeName(ctx, nodeName, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth) {
      ctx.fillStyle = 'black';

      if (rackABSX == 0) {
        ctx.fillText(nodeName, nodeABSX - 55, nodeABSY + nodeHeight - 3);
      } else {
        ctx.fillText(nodeName, nodeABSX + nodeWidth + self.config.RACKBORDERWIDTH + 3, nodeABSY + nodeHeight - 3);
      }
    }

    this.getConfig = function () {
      return this.config;
    };

    this.drawRack = function (rack) {
      var ctx = ($('#cv_rackmap_' + rack['name'])[0]).getContext("2d");
      var config = this.config;
      var width;
      var X;
      var Y;

      var rackABS = getRackABSCoordinates(rack);
      var rackABSX = rackABS.X;
      var rackABSY = rackABS.Y;

      drawRectangle(ctx, rackABSX, rackABSY, config.RACKWIDTH, config.RACKHEIGHT, 'rgba(89,89,89,1)');

      drawRectangleBorder(ctx, rackABSX, rackABSY, config.RACKBORDERWIDTH, config.RACKHEIGHT, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');
      X = rackABSX + config.RACKWIDTH - config.RACKBORDERWIDTH;
      drawRectangleBorder(ctx, X, rackABSY, config.RACKBORDERWIDTH, config.RACKHEIGHT, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.RACKBORDERWIDTH;
      Y = rackABSY;
      width = config.rackWidth - (2 * config.RACKBORDERWIDTH);
      drawRectangleBorder(ctx, X, Y, width, config.RACKBORDERWIDTH, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.RACKBORDERWIDTH;
      Y = rackABSY + config.RACKHEIGHT - config.RACKBORDERWIDTH;
      width = config.rackWidth - (2 * config.RACKBORDERWIDTH);
      drawRectangleBorder(ctx, X, Y, width, config.RACKBORDERWIDTH, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      Y = rackABSY + config.RACKHEIGHT;
      drawRectangleBorder(ctx, rackABSX, Y, config.RACKWIDTH, config.FLOORWIDTH, 1, 'rgba(89,89,89,1)', 'rgba(39,39,39,1)');

      Y = rackABSY + config.RACKHEIGHT + config.FLOORWIDTH;
      drawRectangleBorder(ctx, rackABSX, Y, config.FOOTWIDTH, config.FOOTHEIGHT, 1, 'rgba(49,49,49,1)', 'rgba(39,39,39,1)');

      X = rackABSX + config.RACKWIDTH - config.FOOTWIDTH;
      Y = rackABSY + config.RACKHEIGHT + config.FLOORWIDTH;
      drawRectangleBorder(ctx, X, Y, config.FOOTWIDTH, config.FOOTHEIGHT, 1, "rgba(49,49,49,1)", "rgba(39,39,39,1)");

      ctx.font = '14px sans-serif';
      ctx.fillText('rack ' + rack.name, rackABSX + 60, rackABSY - 3);
      ctx.font = '10px sans-serif';
    };

    this.drawNode = function (rack, rackNode, slurmNode) {
      var ctx = ($('#cv_rackmap_' + rack.name)[0]).getContext('2d');

      var rackABS = getRackABSCoordinates(rack);

      var rackABSX = rackABS.X;
      var rackABSY = rackABS.Y;

      var nodeABSX = rackABSX + this.config.RACKBORDERWIDTH + (rackNode.posx * this.config.RACKINSIDEWIDTH);
      var nodeABSY = rackABSY + this.config.RACKHEIGHT - this.config.RACKBORDERWIDTH - (rackNode.posy * this.config.RACKUNITHEIGHT);

      var nodeWidth = rackNode.width * this.config.RACKINSIDEWIDTH - this.config.NODEMARGIN;
      var nodeHeight = rackNode.height * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      var nodeColors = colorsDraw.findLedColor(slurmNode, '2D');
      var nodeColor = nodeColors.node;
      var stateColor = nodeColors.state;

      drawRectangle(ctx, nodeABSX, nodeABSY, nodeWidth, nodeHeight, nodeColor);

      if (stateColor) {
        drawLed(ctx, nodeABSX + 4, nodeABSY + 4, stateColor);
      }

      writeNodeName(ctx, rackNode.name, rackNode.posx, nodeABSX, nodeABSY, nodeHeight, nodeWidth);
    }

    this.drawNodeCores = function (rack, rackNode, slurmNode, allocatedCPUs) {
      if (!this.intersections) {
        this.intersections = new IntersectionsDraw();
      }

      var ctx = ($('#cv_rackmap_' + rack.name)[0]).getContext('2d');

      var rackABS = getRackABSCoordinates(rack)
      var rackABSX = rackABS.X;
      var rackABSY = rackABS.Y;

      var nodeABSX = rackABSX + this.config.RACKBORDERWIDTH + (rackNode.posx * this.config.RACKINSIDEWIDTH);
      var nodeABSY = rackABSY + this.config.RACKHEIGHT - this.config.RACKBORDERWIDTH - (rackNode.posy * this.config.RACKUNITHEIGHT);

      var nodeWidth = rackNode.width * this.config.RACKINSIDEWIDTH - this.config.NODEMARGIN;
      var nodeHeight = rackNode.height * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      var nodeColors = colorsDraw.findLedColor(slurmNode, '2D').node;
      var stateColor = colorsDraw.findLedColor(slurmNode, '2D').state;

      this.intersections.addNodeIntersections({ rack: rack.name, node: rackNode.name }, nodeABSX, (nodeABSX + nodeWidth), nodeABSY, (nodeABSY + nodeHeight));
      drawRectangle(ctx, nodeABSX, nodeABSY, nodeWidth, nodeHeight, colors.LED.IDLE);

      if (stateColor) {
        drawLed(ctx, nodeABSX + 4, nodeABSY + 4, stateColor);
      }

      var coresNumber = 0;
      if (slurmNode) {
        coresNumber = slurmNode.cpus
      }

      var coresTableInfos = bestFactor(this.config.NODEWIDTH, this.config.NODEHEIGHT, coresNumber);
      var coresColumns = coresTableInfos[1];
      var coresRows = coresTableInfos[0];

      var coreABSX = 0;
      var coreABSY = 0;

      var coreHeight = Math.round((nodeHeight - 4) / coresRows);
      var coreWidth = Math.round((nodeWidth - 20) / coresColumns);
      var coreSize = Math.min(coreHeight, coreWidth);

      var coreId;
      var coresJobNumber = 0;
      var coresDrawn = 0;
      var coreCoords = null;
      var coreColor = null;

      for (coreId = 0; coreId < coresNumber; coreId++) {
        coreCoords = getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize);
        coreABX = coreCoords.x;
        coreABSY = coreCoords.y;
        drawRectangleBorder(ctx, coreABX, coreABSY, coreSize, coreSize, 1, colors.LED.IDLE, colors.LED.COREBORDER);
      }

      for (var job in allocatedCPUs) {
        if (allocatedCPUs.hasOwnProperty(job)) {
          coresJobNumber = allocatedCPUs[job];
          coreColor = pickJobColor(parseInt(job));

          for (coreId = 0; coreId < coresDrawn + coresJobNumber; coreId++) {
            coreCoords = getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize);

            coreABSX = coreCoords.x;
            coreABSY = coreCoords.y;

            this.intersections.addCoreIntersections({ rack: rack.name, node: rackNode.name, core: coreId, job: job }, coreABSX, (coreABSX + coreSize), coreABSY, (coreABSY + coreSize));

            drawRectangleBorder(ctx, coreABSX, coreABSY, coreSize, coreSize, 1, coreColor, colors.COREBORDER);
          }

          coresDrawn += coresJobNumber;
        }
      }

      writeNodeName(ctx, rackNode.name, rackNode.posx, nodeABSX, nodeABSY, nodeHeight, nodeWidth);
    }


  };
});
