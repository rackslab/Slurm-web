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
  'jquery',
  'text!/slurm-web-conf/2d.config.json',
  'text!/slurm-web-conf/2d.colors.config.json',
  '2d-intersections-draw',
  'colors-draw'
], function($, d2Config, d2ColorsConfig, IntersectionsDraw, colorsDraw) {
  var config = JSON.parse(d2Config),
    colors = JSON.parse(d2ColorsConfig),
    canvasConfig = config.CANVAS;

  return function() {
    var self = this;

    this.intersections = null;
    this.config = $.extend(config.CANVAS, {
      RACKINSIDEHEIGHT: canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT,
      RACKHEIGHT: canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT + 2 * canvasConfig.RACKBORDERWIDTH,
      RACKWIDTH: canvasConfig.RACKINSIDEWIDTH + 2 * canvasConfig.RACKBORDERWIDTH,
      CANVASHEIGHT: canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT + 2 * canvasConfig.RACKBORDERWIDTH + canvasConfig.CANVASMARGINTOP,
      NODESPERCOL: Math.floor(canvasConfig.NODESPERRACK / canvasConfig.NODESPERROW),
      NODEWIDTH: Math.floor((canvasConfig.RACKINSIDEWIDTH + 2 * canvasConfig.RACKBORDERWIDTH - 2 * canvasConfig.RACKBORDERWIDTH - (canvasConfig.NODESPERROW * canvasConfig.NODEMARGIN + canvasConfig.NODEMARGIN)) / canvasConfig.NODESPERROW),
      NODEHEIGHT: Math.floor((canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT + 2 * canvasConfig.RACKBORDERWIDTH - 2 * canvasConfig.RACKBORDERWIDTH - (canvasConfig.NODESPERCOL * canvasConfig.NODEMARGIN + canvasConfig.NODEMARGIN)) / canvasConfig.NODESPERCOL),
      NODESTATEHEIGHT: Math.floor((canvasConfig.RACKUNITNUMBER * canvasConfig.RACKUNITHEIGHT + 2 * canvasConfig.RACKBORDERWIDTH - 2 * canvasConfig.RACKBORDERWIDTH - (canvasConfig.NODESPERCOL * canvasConfig.NODEMARGIN + canvasConfig.NODEMARGIN)) / canvasConfig.NODESPERCOL)
    });

    function getRackABSCoordinates() {
      var ABSX = self.config.LEFTMARGIN,
        ABSY = self.config.TOPMARGIN;

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
      var nFactors = [],
        i = 0;

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

    function bestFactor(nodeWidth, nodeHeight, coresNumber) {
      var i, allFactors, goalRatio, ratio, bestRatio, bestFactorId;

      if (coresNumber === 0) {
        return [ null, null ];
      }

      allFactors = factors(coresNumber);
      goalRatio = (self.config.NODEWIDTH - 20) / (self.config.NODEHEIGHT - 4);
      ratio = -1;
      bestRatio = -1;
      bestFactorId = 0;

      for (i = 0; i < allFactors.length; i++) {
        ratio = allFactors[i][1] / allFactors[i][0];

        if (Math.abs(ratio - goalRatio) < Math.abs(bestRatio - goalRatio)) {
          bestRatio = ratio;
          bestFactorId = i;
        }
      }

      return allFactors[bestFactorId];
    }

    function pickJobColor(jobId) {
      return colors.JOB[jobId % colors.JOB.length];
    }

    function getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize) {
      var coreX = Math.floor(coreId / coresRows),
        coreY = Math.floor(coreId % coresRows),
        coreXOrigin = nodeABSX + nodeWidth - coresColumns * coreSize - 2,
        coreYorigin = nodeABSY + Math.round((nodeHeight - coresRows * coreSize) / 2),
        coreABSX = coreXOrigin + coreX * coreSize,
        coreABSY = coreYorigin + coreY * coreSize;

      return { x: coreABSX, y: coreABSY };
    }

    function getTextWidth(ctx, text) {
      return ctx.measureText(text).width;
    }

    function getTextHeight(font) {
      var body,
        text = $('<span>Hg</span>').css({ fontFamily: font }),
        block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>'),
        div = $('<div></div>'),
        result = {};

      div.append(text, block);

      body = $('body');
      body.append(div);

      try {
        block.css({ verticalAlign: 'baseline' });
        result.ascent = block.offset().top - text.offset().top;

        block.css({ verticalAlign: 'bottom' });
        result.height = block.offset().top - text.offset().top;

        result.descent = result.height - result.ascent;
      } finally {
        div.remove();
      }

      return result;
    }

    function getTextColor(color) {
      var brightness;

      color = color.replace('rgba(', '');
      color = color.split(',');

      brightness = color[0] * 299 + color[1] * 587 + color[2] * 114;
      brightness /= 255000;

      if (brightness >= 0.5) {
        return 'black';
      }

      return 'white';
    }

    function cutTextHorizontal(ctx, text, maxSize) {
      var width = getTextWidth(ctx, text);

      while (width >= maxSize) {
        text = text.slice(0, -1);
        width = getTextWidth(ctx, text);
      }

      text = text.slice(0, -3) + '...';
      width = getTextWidth(ctx, text);

      return { text: text, width: width };
    }

    function writeNodeNameVertical(ctx, rackName, nodeName, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth) {
      var newText, posX, posY,
        textWidth = getTextWidth(ctx, nodeName),
        textHeight = getTextHeight(ctx.font);

      if (textWidth >= nodeHeight) {
        self.intersections.addNodeHoverIntersections({ nodeName: nodeName, rackName: rackName }, nodeABSX, nodeABSX + nodeWidth, nodeABSY, nodeABSY + nodeHeight);
        newText = cutTextHorizontal(ctx, nodeName, nodeHeight);
        textWidth = newText.width;
        nodeName = newText.text;
      }

      posX = (nodeWidth - textHeight.descent) / 2;
      posY = (nodeHeight - textWidth) / 2;

      ctx.save();
      ctx.translate(nodeABSX - posX + nodeWidth, nodeABSY - posY + nodeHeight);
      ctx.rotate(-Math.PI / 2);

      if (rackABSX === 0) {
        ctx.fillText(nodeName, 0, 0);
      } else {
        ctx.fillText(nodeName, 0, 0);
      }
      ctx.restore();
    }

    function writeNodeNameHorizontal(ctx, rackName, nodeName, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth) {
      var newText, posX,
        textWidth = getTextWidth(ctx, nodeName),
        textHeight = getTextHeight(ctx.font);

      if (textWidth >= nodeWidth - 10) {
        self.intersections.addNodeHoverIntersections({ nodeName: nodeName, rackName: rackName }, nodeABSX, nodeABSX + nodeWidth, nodeABSY, nodeABSY + nodeHeight);
        newText = cutTextHorizontal(ctx, nodeName, nodeWidth - 24);
        textWidth = newText.width;
        nodeName = newText.text;
      }

      posX = (textWidth - nodeWidth) / 2;

      if (rackABSX === 0) {
        ctx.fillText(nodeName, nodeABSX - posX, nodeABSY + textHeight.ascent);
      } else {
        ctx.fillText(nodeName, nodeABSX - posX, nodeABSY + textHeight.ascent);
      }
    }

    function writeNodeName(ctx, rackName, nodeName, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth, nodeColor) {
      ctx.fillStyle = getTextColor(nodeColor);

      if (nodeWidth >= nodeHeight) {
        writeNodeNameHorizontal(ctx, rackName, nodeName, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth);
      } else if (nodeWidth <= nodeHeight) {
        writeNodeNameVertical(ctx, rackName, nodeName, rackABSX, nodeABSX, nodeABSY, nodeHeight, nodeWidth);
      }
    }

    this.getConfig = function() {
      return this.config;
    };

    this.drawRack = function(rack) {
      var rackNameABSX,
        ctx = $('#cv_rackmap_' + rack.name)[0].getContext('2d'),
        config = this.config,
        width,
        X,
        Y,
        rackABS = getRackABSCoordinates(rack),
        rackABSX = rackABS.X,
        rackABSY = rackABS.Y;

      drawRectangle(ctx, rackABSX, rackABSY, config.RACKWIDTH, config.RACKHEIGHT, 'rgba(89,89,89,1)');

      drawRectangleBorder(ctx, rackABSX, rackABSY, config.RACKBORDERWIDTH, config.RACKHEIGHT, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.RACKWIDTH - config.RACKBORDERWIDTH;
      drawRectangleBorder(ctx, X, rackABSY, config.RACKBORDERWIDTH, config.RACKHEIGHT, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.RACKBORDERWIDTH;
      Y = rackABSY;

      width = config.RACKWIDTH - 2 * config.RACKBORDERWIDTH;
      drawRectangleBorder(ctx, X, Y, width, config.RACKBORDERWIDTH, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rackABSX + config.RACKBORDERWIDTH;
      Y = rackABSY + config.RACKHEIGHT - config.RACKBORDERWIDTH;
      width = config.RACKWIDTH - 2 * config.RACKBORDERWIDTH;
      drawRectangleBorder(ctx, X, Y, width, config.RACKBORDERWIDTH, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      Y = rackABSY + config.RACKHEIGHT;
      drawRectangleBorder(ctx, rackABSX, Y, config.RACKWIDTH, config.FLOORWIDTH, 1, 'rgba(89,89,89,1)', 'rgba(39,39,39,1)');

      Y = rackABSY + config.RACKHEIGHT + config.FLOORWIDTH;
      drawRectangleBorder(ctx, rackABSX, Y, config.FOOTWIDTH, config.FOOTHEIGHT, 1, 'rgba(49,49,49,1)', 'rgba(39,39,39,1)');

      X = rackABSX + config.RACKWIDTH - config.FOOTWIDTH;
      Y = rackABSY + config.RACKHEIGHT + config.FLOORWIDTH;
      drawRectangleBorder(ctx, X, Y, config.FOOTWIDTH, config.FOOTHEIGHT, 1, 'rgba(49,49,49,1)', 'rgba(39,39,39,1)');

      ctx.font = config.RACKFONTSIZE + 'px ' + config.RACKFONTFAMILY;

      rackNameABSX = (config.CANVASWIDTH - ctx.measureText('rack ' + rack.name).width) / 2;

      ctx.fillText('rack ' + rack.name, rackNameABSX, rackABSY - 3);
      ctx.font = config.NODEFONTSIZE + 'px ' + config.NODEFONTFAMILY;
    };

    this.drawNode = function(rack, rackNode, slurmNode) {
      var ctx, rackABS, rackABSX, rackABSY, nodeABSX, nodeABSY, nodeWidth,
        nodeHeight, nodeColors, nodeColor, stateColor;

      if (!this.intersections) {
        this.intersections = new IntersectionsDraw();
      }

      ctx = $('#cv_rackmap_' + rack.name)[0].getContext('2d');

      rackABS = getRackABSCoordinates(rack);

      rackABSX = rackABS.X;
      rackABSY = rackABS.Y;

      nodeABSX = rackABSX + this.config.RACKBORDERWIDTH + rackNode.posx * this.config.RACKINSIDEWIDTH;
      nodeABSY = rackABSY + this.config.RACKHEIGHT - this.config.RACKBORDERWIDTH - (rackNode.posy + 2) * this.config.RACKUNITHEIGHT;

      nodeWidth = rackNode.width * this.config.RACKINSIDEWIDTH - this.config.NODEMARGIN;
      nodeHeight = rackNode.height * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      nodeColors = colorsDraw.findLedColor(slurmNode, '2D');
      nodeColor = nodeColors.node;
      stateColor = nodeColors.state;

      drawRectangle(ctx, nodeABSX, nodeABSY, nodeWidth, nodeHeight, nodeColor);

      if (stateColor) {
        drawLed(ctx, nodeABSX + 4, nodeABSY + 4, stateColor);
      }

      writeNodeName(ctx, rack.name, rackNode.name, rackNode.posx, nodeABSX, nodeABSY, nodeHeight, nodeWidth, nodeColor);
    };

    this.clearNodesHoverIntersections = function() {
      this.intersections = null;
    };

    // TODO : refacto in several smaller functions
    this.drawNodeCores = function(rack, rackNode, slurmNode, allocatedCPUs) {
      var ctx, rackABS, rackABSX, rackABSY, nodeABSX, nodeABSY, nodeWidth,
        nodeHeight, stateColor, coresNumber, coresTableInfos, coresColumns,
        coresRows, coreABSX, coreABSY, coreHeight, coreWidth, coreSize, coreId,
        coresJobNumber, coresDrawn, coreCoords, coreColor, job;

      if (!this.intersections) {
        this.intersections = new IntersectionsDraw();
      }

      ctx = $('#cv_rackmap_' + rack.name)[0].getContext('2d');

      rackABS = getRackABSCoordinates(rack);
      rackABSX = rackABS.X;
      rackABSY = rackABS.Y;

      nodeABSX = rackABSX + this.config.RACKBORDERWIDTH + rackNode.posx * this.config.RACKINSIDEWIDTH;
      nodeABSY = rackABSY + this.config.RACKHEIGHT - this.config.RACKBORDERWIDTH - (rackNode.posy + 2) * this.config.RACKUNITHEIGHT;

      nodeWidth = rackNode.width * this.config.RACKINSIDEWIDTH - this.config.NODEMARGIN;
      nodeHeight = rackNode.height * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      stateColor = colorsDraw.findLedColor(slurmNode, '2D').state;

      this.intersections.addNodeIntersections({ rack: rack.name, node: rackNode.name }, nodeABSX, nodeABSX + nodeWidth, nodeABSY, nodeABSY + nodeHeight);

      drawRectangle(ctx, nodeABSX, nodeABSY, nodeWidth, nodeHeight, colors.LED.IDLE);

      this.intersections.addNodeHoverIntersections({ nodeName: rackNode.name, rackName: rack.name }, nodeABSX, nodeABSX + nodeWidth, nodeABSY, nodeABSY + nodeHeight);

      if (stateColor) {
        drawLed(ctx, nodeABSX + 4, nodeABSY + 4, stateColor);
      }

      coresNumber = 0;
      if (slurmNode) {
        coresNumber = slurmNode.cpus;
      }

      coresTableInfos = bestFactor(this.config.NODEWIDTH, this.config.NODEHEIGHT, coresNumber);
      coresColumns = coresTableInfos[1];
      coresRows = coresTableInfos[0];

      coreABSX = 0;
      coreABSY = 0;

      coreHeight = Math.round((nodeHeight - 4) / coresRows);
      coreWidth = Math.round((nodeWidth - 20) / coresColumns);
      coreSize = Math.min(coreHeight, coreWidth);

      coreId = 0;
      coresJobNumber = 0;
      coresDrawn = 0;
      coreCoords = null;
      coreColor = null;

      for (job in allocatedCPUs) {
        if (allocatedCPUs.hasOwnProperty(job)) {
          coresJobNumber = allocatedCPUs[job];
          coreColor = pickJobColor(parseInt(job, 10));

          for (; coreId < coresDrawn + coresJobNumber; coreId++) {
            coreCoords = getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize);
            coreABSX = coreCoords.x;
            coreABSY = coreCoords.y;
            this.intersections.addCoreIntersections({ rack: rack.name, node: rackNode.name, core: coreId, job: job }, coreABSX, coreABSX + coreSize, coreABSY, coreABSY + coreSize);
            drawRectangleBorder(ctx, coreABSX, coreABSY, coreSize, coreSize, 1, coreColor, colors.COREBORDER);
          }
          coresDrawn += coresJobNumber;
        }
      }

      for (; coreId < coresNumber; coreId++) {
        coreCoords = getCoreABSCoordinates(nodeWidth, nodeHeight, nodeABSX, nodeABSY, coreId, coresRows, coresColumns, coreSize);
        coreABSX = coreCoords.x;
        coreABSY = coreCoords.y;
        drawRectangleBorder(ctx, coreABSX, coreABSY, coreSize, coreSize, 1, colors.LED.IDLE, colors.COREBORDER);
      }
    };
  };
});
