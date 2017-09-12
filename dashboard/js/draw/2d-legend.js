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
  'text!/slurm-web-conf/2d.colors.config.json'
], function($, colorsConfig) {
  var colors = JSON.parse(colorsConfig);

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

  function drawRectangle(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  return {
    legend: { x: 0, y: 0, width: 0, height: 0 },

    drawLegend: function(type) {
      var ctx = $('#cv_rackmap_legend')[0].getContext('2d'),
        title = 'node state:';

      this.legend = { x: 10, y: 15, width: 0, height: 0 };

      ctx.fillStyle = 'black';
      ctx.font = '12px sans-serif';
      ctx.fillText(title, this.legend.x - 3, this.legend.y);
      this.updateLegendWidth(ctx, title, 3);

      ctx.font = '10px sans-serif';
      this.drawStateText(ctx, 'available', colors.LED.AVAILABLE);
      this.drawStateText(ctx, 'drained', colors.LED.DRAINED);
      this.drawStateText(ctx, 'down', colors.LED.DOWN);
      this.drawStateText(ctx, 'reserved', colors.LED.RESERVED);
      this.drawStateText(ctx, 'maint', colors.LED.MAINT);

      if (type === 'racks') {
        this.legend.y += 10;
        this.drawNodeText(ctx, 'fully allocated', colors.LED.FULLYALLOCATED);
        this.drawNodeText(ctx, 'partly allocated', colors.LED.PARTALLOCATED);
        this.drawNodeText(ctx, 'idle', colors.LED.IDLE);
        this.drawNodeText(ctx, 'unavailable', colors.LED.UNAVAILABLE);
        this.drawNodeText(ctx, 'unknown', colors.LED.UNKNOWN);
      }

      this.legend.height = this.legend.y + 10;
      this.legend.width += 15;

      drawRectangleBorder(ctx, 1, 1, this.legend.width, this.legend.height, 1, 'transparent', 'rgba(200,200,200,1)');
    },

    drawNodeText: function(ctx, text, color) {
      this.legend.y += 10;
      drawRectangle(ctx, this.legend.x - 2, this.legend.y - 8, 9, 9, color);
      this.drawText(ctx, text, { shiftX: 10 });
      this.updateLegendWidth(ctx, text, 12);
    },

    drawStateText: function(ctx, text, color) {
      this.legend.y += 10;
      drawLed(ctx, this.legend.x + 1, this.legend.y, color);
      this.drawText(ctx, text, { shiftX: 10, shiftY: 3 });
      this.updateLegendWidth(ctx, text, 9);
    },

    drawText: function(ctx, text, opts) {
      var options = opts || {},
        shiftX = options.shiftX || 0,
        shiftY = options.shiftY || 0,
        color = options.color || 'black';

      ctx.fillStyle = color;
      ctx.fillText(text, this.legend.x + shiftX, this.legend.y + shiftY);
    },

    updateLegendWidth: function(ctx, text, shift) {
      this.legend.width = Math.max(this.legend.width, ctx.measureText(text).width + (shift || 0));
    }
  };
});
