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
  'colors-draw',
  'factor-draw'
], function($, d2Config, d2ColorsConfig, IntersectionsDraw, colorsDraw, factorDraw) {
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
      CANVASWIDTH: canvasConfig.LEFTMARGIN * 2 + canvasConfig.RACKWIDTH
    });

    function getRackABSCoordinates() {
      return { x: self.config.LEFTMARGIN, y: self.config.TOPMARGIN };
    }

    function drawRectangle(ctx, x, y, width, height, color) {
      x = Math.round(x);
      y = Math.round(y);
      width = Math.round(width);
      height = Math.round(height);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }

    function drawRectangleBorder(ctx, X, Y, width, height, borderWidth, colorFill, colorBorder) {
      X = Math.round(X);
      Y = Math.round(Y);
      width = Math.round(width);
      height = Math.round(height);

      ctx.beginPath();
      ctx.rect(X - 0.5, Y - 0.5, width, height);
      ctx.fillStyle = colorFill;
      ctx.fill();
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = colorBorder;
      ctx.stroke();
    }

    function drawLed(ctx, x, y, color) {
      x = Math.round(x);
      y = Math.round(y);

      ctx.beginPath();
      ctx.arc(x, y, self.config.NODELEDRADIUS, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
    }

    function pickJobColor(jobId) {
      return colors.JOB[jobId % colors.JOB.length];
    }

    function getCoreABSCoordinates(node, coreId, coresRows, coresColumns, coreSize) {
      var coreX = Math.floor(coreId / coresRows),
        coreY = Math.floor(coreId % coresRows),
        coreXOrigin = node.x + node.width -
          coresColumns * coreSize -
          self.config.NODEHORIZONTALPADDING,
        coreYorigin = node.y + node.height -
          coresRows * coreSize -
          self.config.NODEVERTICALPADDING,
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

    function writeNodeNameVertical(ctx, rackName, nodeName, reason, rackABSX, node) {
      var newText, posX, posY,
        textWidth = getTextWidth(ctx, nodeName),
        textHeight = getTextHeight(ctx.font);

      // Whether textWidth >= node.heigh or not, as long as the reason is not null,
      // it will show when mouse hover on the node in Rack view.
      if (textWidth >= node.height) {
        self.intersections.addNodeHoverIntersections({ nodeName: nodeName, rackName: rackName, reason: reason }, node);
        newText = cutTextHorizontal(ctx, nodeName, node.height);
        textWidth = newText.width;
        nodeName = newText.text;
      } else if (reason){
        self.intersections.addNodeHoverIntersections({ nodeName: nodeName, rackName: rackName, reason: reason }, node);
      }

      posX = (node.width - textHeight.descent) / 2 + self.config.NODENAMEHORIZONTALOFFSET;
      posY = (node.height - textWidth) / 2 + self.config.NODENAMEVERTICALOFFSET;

      ctx.save();
      ctx.translate(node.x - posX + node.width, node.y - posY + node.height);
      ctx.rotate(-Math.PI / 2);

      ctx.fillText(nodeName, 0, 0);
      ctx.restore();
    }

    function writeNodeNameHorizontal(ctx, rackName, nodeName, reason, rackABSX, node) {
      var newText, posX,
        textWidth = getTextWidth(ctx, nodeName),
        textHeight = getTextHeight(ctx.font);

      // Whether textWidth >= node.heigh or not, as long as the reason is not null,
      // it will show when mouse hover on the node in Rack view.
      if (textWidth >= node.width - 10) {
        self.intersections.addNodeHoverIntersections({ nodeName: nodeName, rackName: rackName, reason: reason }, node);
        newText = cutTextHorizontal(ctx, nodeName, node.width - 24);
        textWidth = newText.width;
        nodeName = newText.text;
      } else if (reason){
        self.intersections.addNodeHoverIntersections({ nodeName: nodeName, rackName: rackName, reason: reason }, node);
      }

      posX = node.x - (textWidth - node.width) / 2 + self.config.NODENAMEHORIZONTALOFFSET;
      posY = node.y + (node.height + textHeight.descent) / 2 + self.config.NODENAMEVERTICALOFFSET;

      ctx.fillText(nodeName, posX, posY);
    }

    function writeNodeName(ctx, rackName, nodeName, reason, rackABSX, node) {
      ctx.fillStyle = getTextColor(node.color);

      if (node.width >= node.height) {
        writeNodeNameHorizontal(ctx, rackName, nodeName, reason, rackABSX, node);
      } else if (node.width <= node.height) {
        writeNodeNameVertical(ctx, rackName, nodeName, reason, rackABSX, node);
      }
    }

    function drawNodeStateColor(ctx, node) {
      var ledABSX = node.x + self.config.NODEHORIZONTALPADDING + self.config.NODELEDRADIUS + self.config.NODELEDPADDING,
        ledABSY = node.y + self.config.NODEVERTICALPADDING + self.config.NODELEDRADIUS + self.config.NODELEDPADDING;

      drawLed(ctx, ledABSX, ledABSY, node.stateColor);
    }

    function drawCores(ctx, rack, rackNode, slurmNode, allocatedCPUs, node) {
      var coresJobNumber, job,
        core = {},
        coreId = 0,
        coresDrawn = 0,
        coresDrawnLayout = [],
        coresNumber = slurmNode && slurmNode.cpus || 0,
        coresTableInfos = factorDraw.bestFactor(node.innerWidth, node.innerHeight, coresNumber),
        coresColumns = coresTableInfos[1],
        coresRows = coresTableInfos[0];

      core.height = Math.floor(node.innerHeight / coresRows);
      core.width = Math.floor(node.innerWidth / coresColumns);
      core.size = Math.min(core.height, core.width);

      for (; coreId < coresNumber; coreId++) {
        core.coords = getCoreABSCoordinates(node, coreId, coresRows, coresColumns, core.size);
        core.x = Math.floor(core.coords.x);
        core.y = Math.floor(core.coords.y);
        drawRectangleBorder(ctx, core.x, core.y, core.size, core.size, 1, colors.LED.IDLE, colors.COREBORDER);
      }

      if(allocatedCPUs){
        for (job in allocatedCPUs) {
          coresJobNumber = allocatedCPUs[job];
          core.color = pickJobColor(parseInt(job, 10));

          if(allocatedCPUs['layout'] !== null){
            for(coreLayout in allocatedCPUs['layout']){
              core.coords = getCoreABSCoordinates(node, allocatedCPUs['layout'][coreLayout], coresRows, coresColumns, core.size);
              core.x = Math.floor(core.coords.x);
              core.y = Math.floor(core.coords.y);
              self.intersections.addCoreIntersections({ rack: rack.name, node: rackNode.name, core: coreId, job: job }, core);
              drawRectangleBorder(ctx, core.x, core.y, core.size, core.size, 1, core.color, colors.COREBORDER);
              coresDrawnLayout.push(allocatedCPUs['layout'][coreLayout]);
            }
          }
        }
      }
      else{
        for (; coreId < coresNumber; coreId++) {
          core.coords = getCoreABSCoordinates(node, coreId, coresRows, coresColumns, core.size);
          core.x = Math.floor(core.coords.x);
          core.y = Math.floor(core.coords.y);
          drawRectangleBorder(ctx, core.x, core.y, core.size, core.size, 1, colors.LED.IDLE, colors.COREBORDER);
        }
      }
      coresDrawn += coresJobNumber;
    }

    this.getConfig = function() {
      return this.config;
    };

    this.drawRack = function(rack) {
      var rackNameABSX, X, Y,
        ctx = $('#cv_rackmap_' + rack.name)[0].getContext('2d'),
        config = this.config,
        width = config.RACKINSIDEWIDTH;

      rack.coords = getRackABSCoordinates(rack);

      drawRectangle(ctx, rack.coords.x, rack.coords.y, config.RACKWIDTH, config.RACKHEIGHT, 'rgba(89,89,89,1)');

      drawRectangleBorder(ctx, rack.coords.x, rack.coords.y, config.RACKBORDERWIDTH, config.RACKHEIGHT, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rack.coords.x + config.RACKWIDTH - config.RACKBORDERWIDTH;
      drawRectangleBorder(ctx, X, rack.coords.y, config.RACKBORDERWIDTH, config.RACKHEIGHT, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rack.coords.x + config.RACKBORDERWIDTH;
      Y = rack.coords.y;

      width = config.RACKWIDTH - 2 * config.RACKBORDERWIDTH;
      drawRectangleBorder(ctx, X, Y, width, config.RACKBORDERWIDTH, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      X = rack.coords.x + config.RACKBORDERWIDTH;
      Y = rack.coords.y + config.RACKHEIGHT - config.RACKBORDERWIDTH;

      drawRectangleBorder(ctx, X, Y, width, config.RACKBORDERWIDTH, 1, 'rgba(141,141,141,1)', 'rgba(85,85,85,1)');

      Y = rack.coords.y + config.RACKHEIGHT;
      drawRectangleBorder(ctx, rack.coords.x, Y, config.RACKWIDTH, config.FLOORWIDTH, 1, 'rgba(89,89,89,1)', 'rgba(39,39,39,1)');

      Y = rack.coords.y + config.RACKHEIGHT + config.FLOORWIDTH;
      drawRectangleBorder(ctx, rack.coords.x, Y, config.FOOTWIDTH, config.FOOTHEIGHT, 1, 'rgba(49,49,49,1)', 'rgba(39,39,39,1)');

      X = rack.coords.x + config.RACKWIDTH - config.FOOTWIDTH;
      Y = rack.coords.y + config.RACKHEIGHT + config.FLOORWIDTH;
      drawRectangleBorder(ctx, X, Y, config.FOOTWIDTH, config.FOOTHEIGHT, 1, 'rgba(49,49,49,1)', 'rgba(39,39,39,1)');

      ctx.font = config.RACKFONTSIZE + 'px ' + config.RACKFONTFAMILY;

      rackNameABSX = (config.CANVASWIDTH - ctx.measureText('rack ' + rack.name).width) / 2;

      ctx.fillText('rack ' + rack.name, rackNameABSX, rack.coords.y - 3);
      ctx.font = config.NODEFONTSIZE + 'px ' + config.NODEFONTFAMILY;
    };

    this.drawNode = function(rack, rackNode, slurmNode) {
      var ctx, nodeColors,
        node = {};

      if (!this.intersections) {
        this.intersections = new IntersectionsDraw();
      }

      ctx = $('#cv_rackmap_' + rack.name)[0].getContext('2d');

      ctx.imageSmoothingEnabled = true;

      rack.coords = getRackABSCoordinates(rack);

      node.x = rack.coords.x + this.config.RACKBORDERWIDTH + rackNode.posx * this.config.RACKINSIDEWIDTH;
      node.y = rack.coords.y + this.config.RACKHEIGHT - this.config.RACKBORDERWIDTH - rackNode.posy * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      node.width = rackNode.width * this.config.RACKINSIDEWIDTH - this.config.NODEMARGIN;
      node.height = rackNode.height * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      node.y -= node.height;

      nodeColors = colorsDraw.findLedColor(slurmNode, '2D');
      node.color = nodeColors.node;
      node.stateColor = nodeColors.state;

      drawRectangle(ctx, node.x, node.y, node.width, node.height, node.color);

      if (node.stateColor) {
        drawNodeStateColor(ctx, node);
      }

      writeNodeName(ctx, rack.name, rackNode.name, slurmNode.reason, rackNode.posx, node);
    };

    this.clearNodesHoverIntersections = function() {
      this.intersections = null;
    };

    this.drawNodeCores = function(rack, rackNode, slurmNode, allocatedCPUs) {
      var ctx,
        node = {};

      if (!this.intersections) {
        this.intersections = new IntersectionsDraw();
      }

      ctx = $('#cv_rackmap_' + rack.name)[0].getContext('2d');

      ctx.imageSmoothingEnabled = true;

      rack.coords = getRackABSCoordinates(rack);

      node.x = rack.coords.x + this.config.RACKBORDERWIDTH + rackNode.posx * this.config.RACKINSIDEWIDTH;
      node.y = rack.coords.y + this.config.RACKHEIGHT - this.config.RACKBORDERWIDTH - rackNode.posy * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      node.width = rackNode.width * this.config.RACKINSIDEWIDTH - this.config.NODEMARGIN;
      node.height = rackNode.height * this.config.RACKUNITHEIGHT - this.config.NODEMARGIN;

      node.y -= node.height;

      node.stateColor = colorsDraw.findLedColor(slurmNode, '2D').state;

      this.intersections.addNodeIntersections({ rack: rack.name, node: rackNode.name }, node);

      drawRectangle(ctx, node.x, node.y, node.width, node.height, colors.LED.IDLE);

      this.intersections.addNodeHoverIntersections({ nodeName: rackNode.name, rackName: rack.name, reason: slurmNode.reason }, node);

      if (node.stateColor) {
        drawNodeStateColor(ctx, node);
      }

      node.innerHeight = node.height - this.config.NODEVERTICALPADDING * 2;
      node.innerWidth = node.width - this.config.NODEHORIZONTALPADDING * 2;

      if (node.innerWidth > node.innerHeight) {
        node.innerWidth -= (this.config.NODELEDRADIUS + this.config.NODELEDPADDING) * 2;
      } else {
        node.innerHeight -= (this.config.NODELEDRADIUS + this.config.NODELEDPADDING) * 2;
      }

      drawCores(ctx, rack, rackNode, slurmNode, allocatedCPUs, node);
    };
  };
});
