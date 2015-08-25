define(['text!/js/core/config.json', 'text!/js/core/colors.config.json'], function (config, colors) {
  var colors = JSON.parse(colors);

  return {
    drawLed: function (ctx, x, y, color) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
    },

    pickJobColor: function (jobId) {
      return jobColors[jobId % jobColors.length];
    },

    drawLegend: function (isJobmaps) {
      var ctx = $('#cv_rackmap')[0].getContext("2d");
      var legendX = canvas_width - 80;
      var legendY = canvas_height - 50;

      if (isJobmaps === true) {
        legendHeight = 65;
        legendWidth = 90;
      } else {
        legendHeight = 90;
        legendWidth = 98;
      }

      draw_rect_bdr(ctx, 1, 1, legendWidth, legendHeight, 1, 'rgba(255,255,255,1)', 'rgba(200,200,200,1)');

      ctx.fillStyle = 'black';
      ctx.font = '12px sans-serif';
      ctx.fillText('node state:', legendX - 3, legendY);
      ctx.font = '10px sans-serif';

      legendY += 10;
      draw_led(ctx, legendX + 1, legendY, colors.colorAvailable); // here color available
      ctx.fillStyle = 'black';
      ctx.fillText('available', legendX + 10, legendY + 3);

      legendY += 10;
      draw_led(ctx, legendX + 1, legendY, colors.colorDrained);
      ctx.fillStyle = 'black';
      ctx.fillText('drained', legendX + 10, legendY + 3);

      legendY += 10;
      this.drawLed(ctx, legendX + 1, legendY, colors.colorDown);
      ctx.fillStyle = 'black';
      ctx.fillText('down', legendX + 10, legendY + 3);

      legendY += 10;
      draw_led(ctx, legendX + 1, legendY, colors.colorReserved);
      ctx.fillStyle = 'black';
      ctx.fillText('reserved', legendX + 10, legendY + 3);

      if (isJobmaps === false) {
        legendY += 10;
        draw_rect(ctx, legendX - 2, legendY, 9, 9, colorFullyAllocated);
        ctx.fillStyle = 'black';
        ctx.fillText('fully allocated', legendX + 10, legendY + 10);

        legendY += 10;
        draw_rect(ctx, legendX - 2, legendY, 9, 9, colorPartAllocated);
        ctx.fillStyle = 'black';
        ctx.fillText('partly allocated', legendX + 10, legendY + 10);
      }
    },
// here
    drawNode: function (rack, racknode, slurmnode) {
      if (config.multiCanvas) {
        var ctx = document.getElementById("cv_rackmap_" + rack.name).getContext("2d");
      } else {
        var ctx = document.getElementById("cv_rackmap").getContext("2d");
      }

      /* relative coordinate of node inside the rack */
      nodeCoordX = racknode.posx; // unit is the number of U, starting from the bottom of the rack
      nodeCoordY = racknode.posy;

      rackAbs = get_rack_abs_coord(rack);
      rackAbsX = rackAbs[0];
      rackAbsY = rackAbs[1];

      nodeAbs_x = rack_abs_x + rack_border_width + (node_coord_x * rack_inside_width);
      nodeAbs_y = rack_abs_y + rack_height - rack_border_width - (node_coord_y * rack_u_height);

      node_width = racknode.width * rack_inside_width - node_margin;
      node_height = racknode.height * rack_u_height - node_margin;

      //console.log("node_id: " + id_node + " -> " + node_rack + "/" + id_node_in_rack + " -> coord:" + node_coord_x + "/" + node_coord_y + " abs: " + node_abs_x + "/" + node_abs_y);

      var node_colors = get_node_colors(slurmnode);
      var node_color = node_colors[0];
      var state_color = node_colors[1];

      /* node rectangle */
      draw_rect(ctx, node_abs_x, node_abs_y, node_width, node_height, node_color);

      /* draw status LED */
      if (state_color) {
        draw_led(ctx, node_abs_x + 4, node_abs_y + 4, state_color);
      }

      /* write node name */
      write_node_name(ctx, racknode.name, node_abs_x, node_abs_y, node_height, node_width);

    },
    function drawNodeCores(rack, rackNode, slurmNode, allocatedCPUs) {

      if (multi_canvas) {
        var ctx = document.getElementById("cv_rackmap_" + rack.name).getContext("2d");
      } else {
        var ctx = document.getElementById("cv_rackmap").getContext("2d");
      }

      /* relative coordinate of node inside the rack */
      node_coord_x = racknode.posx; // unit is the number of U, starting from the bottom of the rack
      node_coord_y = racknode.posy;

      rack_abs = get_rack_abs_coord(rack);
      rack_abs_x = rack_abs[0];
      rack_abs_y = rack_abs[1];

      node_abs_x = rack_abs_x + rack_border_width + (node_coord_x * rack_inside_width);
      node_abs_y = rack_abs_y + rack_height - rack_border_width - (node_coord_y * rack_u_height);

      node_width = racknode.width * rack_inside_width - node_margin;
      node_height = racknode.height * rack_u_height - node_margin;

      var node_colors = get_node_colors(slurmnode);
      var state_color = node_colors[1];

      //console.log("node_id: " + id_node + " -> " + node_rack + "/" + id_node_in_rack + " -> coord:" + node_coord_x + "/" + node_coord_y + " abs: " + node_abs_x + "/" + node_abs_y);

      /* node rectangle */
      draw_rect(ctx, node_abs_x, node_abs_y, node_width, node_height, color_idle);

      /* draw status LED */
      if (state_color) {
        draw_led(ctx, node_abs_x + 4, node_abs_y + 4, state_color);
      }

      var cores_nb = slurmnode ? slurmnode.cpus : 0;
      var cores_factor = best_factor(node_width, node_height, cores_nb);
      var cores_cols = cores_factor[1];
      var cores_rows = cores_factor[0];

      //console.log("best factor for node %s: cols %d, rows: %d", slurmnode.name, cores_cols, cores_rows);

      var core_abs_x = 0;
      var core_abs_y = 0;

      var core_height = Math.round((node_height - 4) / cores_rows);
      var core_width = Math.round((node_width - 20) / cores_cols);
      var core_size = Math.min(core_height, core_width);

      var core_id = 0;
      var nb_cores_job = 0;
      var cores_drawn = 0;
      var core_coords = null;
      var core_color = null;

      /* draw allocated core */
      for (var job in allocated_cpus) {
        if (allocated_cpus.hasOwnProperty(job)) {
          nb_cores_job = allocated_cpus[job];
          core_color = pick_job_color(parseInt(job));
          for (; core_id < cores_drawn + nb_cores_job; core_id++) {
            core_coords = get_core_abs_coords(node_width, node_height, node_abs_x, node_abs_y, core_id, cores_rows, cores_cols, core_size);
            core_abs_x = core_coords[0];
            core_abs_y = core_coords[1];
            //console.log("core_abs_x: " + core_abs_x + " core_abs_y: " + core_abs_y);
            draw_rect_bdr(ctx, core_abs_x, core_abs_y, core_size, core_size, 1, core_color, color_core_border);
          }
          cores_drawn += nb_cores_job;
        }
      }
  };
});
