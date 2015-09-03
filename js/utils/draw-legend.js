define(['jquery', 'text!colors.config.json'], function ($, colors) {
  colors = JSON.parse(colors);

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
    drawLegend: function (type) {
      var ctx = ($('#cv_rackmap_legend')[0]).getContext("2d");
      var legendX = 10;
      var legendY = 15;
      var legendWidth;
      var legendHeight;

      if (type === 'jobs-map') {
        legendHeight = 65;
        legendWidth = 90;
      } else {
        legendHeight = 90;
        legendWidth = 98;
      }

      drawRectangleBorder(ctx, 1, 1, legendWidth, legendHeight, 1, 'rgba(255,255,255,1)', 'rgba(200,200,200,1)');

      ctx.fillStyle = 'black';
      ctx.font = '12px sans-serif';
      ctx.fillText('node state:', legendX - 3, legendY);
      ctx.font = '10px sans-serif';

      legendY += 10;
      drawLed(ctx, legendX + 1, legendY, colors.colorAvailable);
      ctx.fillStyle = 'black';
      ctx.fillText('available', legendX + 10, legendY + 3);

      legendY += 10;
      drawLed(ctx, legendX + 1, legendY, colors.colorDrained);
      ctx.fillStyle = 'black';
      ctx.fillText('drained', legendX + 10, legendY + 3);

      legendY += 10;
      drawLed(ctx, legendX + 1, legendY, colors.colorDown);
      ctx.fillStyle = 'black';
      ctx.fillText('down', legendX + 10, legendY + 3);

      legendY += 10;
      drawLed(ctx, legendX + 1, legendY, colors.colorReserved);
      ctx.fillStyle = 'black';
      ctx.fillText('reserved', legendX + 10, legendY + 3);

      if (type === 'jobs-map') {
        legendY += 10;
        drawRectangle(ctx, legendX - 2, legendY, 9, 9, colors.colorFullyAllocated);
        ctx.fillStyle = 'black';
        ctx.fillText('fully allocated', legendX + 10, legendY + 10);

        legendY += 10;
        drawRectangle(ctx, legendX - 2, legendY, 9, 9, colors.colorPartAllocated);
        ctx.fillStyle = 'black';
        ctx.fillText('partly allocated', legendX + 10, legendY + 10);
      }
    }
  }  
});
