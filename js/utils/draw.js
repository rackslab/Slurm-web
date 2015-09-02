define(['jquery', 'text!config.json', 'text!colors.config.json', 'draw-intersections-utils'], function ($, config, colors, Intersections) {
  var config = JSON.parse(config);
  var canvasConfig = config.display.canvas;
  var colors = JSON.parse(colors);

  return function() {
    var self = this;
    this.intersections = null;
    this.config = $.extend(config.display.canvas, {
      rackInsideHeight: canvasConfig.rackUnitNumber * canvasConfig.rackUnitHeight,
      rackHeight: (canvasConfig.rackUnitNumber * canvasConfig.rackUnitHeight) + (2 * canvasConfig.rackBorderWidth),
      rackWidth: canvasConfig.rackInsideWidth + (2 * canvasConfig.rackBorderWidth),
      canvasHeight: (canvasConfig.rackUnitNumber * canvasConfig.rackUnitHeight) + (2 * canvasConfig.rackBorderWidth) + canvasConfig.canvasMarginTop,
      nodesPerCol: Math.floor(canvasConfig.nodesPerRack / canvasConfig.nodesPerRow),
      nodeWidth: Math.floor(((canvasConfig.rackInsideWidth + (2 * canvasConfig.rackBorderWidth)) - (2 * canvasConfig.rackBorderWidth) - ((canvasConfig.nodesPerRow * canvasConfig.nodeMargin) + canvasConfig.nodeMargin)) / canvasConfig.nodesPerRow),
      nodeHeight: Math.floor(((canvasConfig.rackUnitNumber * canvasConfig.rackUnitHeight) + (2 * canvasConfig.rackBorderWidth) - (2 * canvasConfig.rackBorderWidth) - ((canvasConfig.nodesPerCol * canvasConfig.nodeMargin) + canvasConfig.nodeMargin)) / canvasConfig.nodesPerCol),
      nodeStateHeight: Math.floor(((canvasConfig.rackUnitNumber * canvasConfig.rackUnitHeight) + (2 * canvasConfig.rackBorderWidth) - (2 * canvasConfig.rackBorderWidth) - ((canvasConfig.nodesPerCol * canvasConfig.nodeMargin) + canvasConfig.nodeMargin)) / canvasConfig.nodesPerCol)
    });

    function getRackABSCoordinates() {
      var X = 0;
      var Y = 0;

      var ABSX = self.config.leftMargin + (X * (self.config.rackWidth + self.config.rackHorizontalMargin));
      var ABSY = self.config.topMargin + (Y * (self.config.rackHeight + self.config.rackVerticalMargin));

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

    function getNodeColors(slurmnode) {
      var stateColor = colors.colorIdle;
      var nodeColor = colors.colorUnknown;

      if (slurmnode == null) {
        return { node: nodeColor, state: null };
      }

      switch(slurmnode.node_state) {
        case 'IDLE':
        case 'IDLE*':
          stateColor = colors.colorAvailable;
          nodeColor = colors.colorIdle;
          break;
        case 'ALLOCATED':
        case 'ALLOCATED*':
        case 'COMPLETING':
        case 'COMPLETING*':
          if (slurmnode.total_cpus === -slurmnode.cpus) {
            nodeColor = colors.colorFullyAllocated;
          } else {
            nodeColor = colors.colorPartAllocated;
          }
          stateColor = colors.colorAvailable;
          break;
        case 'RESERVED':
          if (slurmnode.total_cpus === -slurmnode.cpus) {
            nodeColor = colors.colorFullyAllocated;
          } else {
            nodeColor = colors.colorPartAllocated;
          }
          stateColor = color_reserved;
          break;
        case 'DRAINING':
        case 'DRAINING*':
        case 'DRAINED':
        case 'DRAINED*':
          stateColor = colors.colorDrained;
          nodeColor = colors.colorUnavailable;
          break;
        case 'DOWN':
        case 'DOWN*':
          stateColor = colors.colorDown;
          nodeColor = colors.colorUnavailable;
          break;
        default:
          state_color = 'black';
          node_color = colors.colorUnknown;
      }

      return { node: nodeColor, state: stateColor };
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
      var goalRatio = (self.config.nodeWidth - 20) / (self.config.nodeHeight - 4);
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
      return colors.jobColors[(jobId % colors.jobColors.length)];
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
        ctx.fillText(nodeName, nodeABSX + nodeWidth + self.config.rackBorderWidth + 3, nodeABSY + nodeHeight - 3);
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

      drawRectangle(ctx, rackABSX, rackABSY, config.rackWidth, config.rackHeight, 'rgba(89,89,89,1)');

      drawRectangleBorder(ctx, rackABSX, rackABSY, config.rackBorderWidth, config.rackHeight, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');
      X = rackABSX + config.rackWidth - config.rackBorderWidth;
      drawRectangleBorder(ctx, X, rackABSY, config.rackBorderWidth, config.rackHeight, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.rackBorderWidth;
      Y = rackABSY;
      width = config.rackWidth - (2 * config.rackBorderWidth);
      drawRectangleBorder(ctx, X, Y, width, config.rackBorderWidth, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.rackBorderWidth;
      Y = rackABSY + config.rackHeight - config.rackBorderWidth;
      width = config.rackWidth - (2 * config.rackBorderWidth);
      drawRectangleBorder(ctx, X, Y, width, config.rackBorderWidth, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      Y = rackABSY + config.rackHeight;
      drawRectangleBorder(ctx, rackABSX, Y, config.rackWidth, config.floorWidth, 1, 'rgba(89,89,89,1)', 'rgba(39,39,39,1)');

      Y = rackABSY + config.rackHeight + config.floorWidth;
      drawRectangleBorder(ctx, rackABSX, Y, config.footWidth, config.footHeight, 1, 'rgba(49,49,49,1)', 'rgba(39,39,39,1)');

      X = rackABSX + config.rackWidth - config.footWidth;
      Y = rackABSY + config.rackHeight + config.floorWidth;
      drawRectangleBorder(ctx, X, Y, config.footWidth, config.footHeight, 1, "rgba(49,49,49,1)", "rgba(39,39,39,1)");

      ctx.font = '14px sans-serif';
      ctx.fillText('rack ' + rack.name, rackABSX + 60, rackABSY - 3);
      ctx.font = '10px sans-serif';
    };

    this.drawNode = function (rack, rackNode, slurmNode) {
      var ctx = ($('#cv_rackmap_' + rack.name)[0]).getContext("2d");

      var rackABS = getRackABSCoordinates(rack);

      var rackABSX = rackABS.X;
      var rackABSY = rackABS.Y;

      var nodeABSX = rackABSX + this.config.rackBorderWidth + (rackNode.posx * this.config.rackInsideWidth);
      var nodeABSY = rackABSY + this.config.rackHeight - this.config.rackBorderWidth - (rackNode.posy * this.config.rackUnitHeight);

      var nodeWidth = rackNode.width * this.config.rackInsideWidth - this.config.nodeMargin;
      var nodeHeight = rackNode.height * this.config.rackUnitHeight - this.config.nodeMargin;

      var nodeColors = getNodeColors(slurmNode);
      var nodeColor = nodeColors.node;
      var stateColor = nodeColors.state;

      drawRectangle(ctx, nodeABSX, nodeABSY, nodeWidth, nodeHeight, nodeColor);

      if (stateColor) {
        drawLed(ctx, nodeABSX + 4, nodeABSY + 4, stateColor);
      }

      writeNodeName(ctx, rackNode.name, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth);
    }

    this.drawNodeCores = function (rack, rackNode, slurmNode, allocatedCPUs) {
      if (!this.intersections) {
        this.intersections = new Intersections();
      }

      var ctx = ($('#cv_rackmap_' + rack.name)[0]).getContext("2d");

      var rackABS = getRackABSCoordinates(rack)
      var rackABSX = rackABS.X;
      var rackABSY = rackABS.Y;

      var nodeABSX = rackABSX + this.config.rackBorderWidth + (rackNode.posx * this.config.rackInsideWidth);
      var nodeABSY = rackABSY + this.config.rackHeight - this.config.rackBorderWidth - (rackNode.posy * this.config.rackUnitHeight);

      var nodeWidth = rackNode.width * this.config.rackInsideWidth - this.config.nodeMargin;
      var nodeHeight = rackNode.height * this.config.rackUnitHeight - this.config.nodeMargin;

      var nodeColors = getNodeColors(slurmNode).node;
      var stateColor = getNodeColors(slurmNode).state;

      this.intersections.addNodeIntersections({ rack: rack.name, node: rackNode.name }, nodeABSX, (nodeABSX + nodeWidth), nodeABSY, (nodeABSY + nodeHeight));
      drawRectangle(ctx, nodeABSX, nodeABSY, nodeWidth, nodeHeight, colors.colorIdle);

      if (stateColor) {
        drawLed(ctx, nodeABSX + 4, nodeABSY + 4, stateColor);
      }

      var coresNumber = 0;
      if (slurmNode) {
        coresNumber = slurmNode.cpus
      }

      var coresTableInfos = bestFactor(this.config.nodeWidth, this.config.nodeHeight, coresNumber);
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

      for (var job in allocatedCPUs) {
        if (allocatedCPUs.hasOwnProperty(job)) {
          coresJobNumber = allocatedCPUs[job];
          coreColor = pickJobColor(parseInt(job));

          for (coreId = 0; coreId < coresDrawn + coresJobNumber; coreId++) {
            coreCoords = getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize);

            coreABSX = coreCoords.x;
            coreABSY = coreCoords.y;

            this.intersections.addCoreIntersections({ rack: rack.name, node: rackNode.name, core: coreId, job: job }, coreABSX, (coreABSX + coreSize), coreABSY, (coreABSY + coreSize));

            drawRectangleBorder(ctx, coreABSX, coreABSY, coreSize, coreSize, 1, coreColor, colors.colorCoreBorder);
          }

          return;

          coresDrawn += coresJobNumber;
        }
      }

      for (coreId= 0; coreId < coresNumber; coreId++) {
        coreCoords = getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize);
        coreABX = coreCoords.x;
        coreABSY = coreCoords.y;
        drawRectangleBorder(ctx, coreABX, coreABSY, coreSize, coreSize, 1, colors.colorIdle, colors.colorCoreBorder);
      }
      
      writeNodeName(ctx, rackNode.name, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth);
    }
  };
});
