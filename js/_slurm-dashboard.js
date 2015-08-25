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

/*
 * Global parameters
 */

var the_origin = new Date("01/01/1970");

var api_dir = "/slurm-restapi";
var cluster = null;

// the maximum number of chars in nodesets in jobs view before being cut
var max_nodes_len = 25;

var left_margin = 60;
var top_margin = 15;
var rack_horz_margin = 100;
var rack_vert_margin = 30;

var rack_nb_u = 42;
var rack_u_height = 12;
var rack_border_width = 10;
var floor_width = 5;
var foot_height = 3;
var foot_width = 7;
var rack_inside_width = 150;
var rack_width = rack_inside_width + 2*rack_border_width;
var rack_inside_height = rack_nb_u * rack_u_height;
var rack_height = rack_inside_height + 2*rack_border_width; // racks floor and feet are ignored

/*
 * Defines whether racks are drawn in one large canvas or in multiple canvas,
 * one per rack.
 */
var multi_canvas = true;

if (multi_canvas) {
  // TODO: compute based on racks dimensions
  var canvas_width = 280;
  var canvas_height = rack_height + 30;
  var canvas_legend_height = 100;
  var canvas_legend_width = 100;
}
else {
  // TODO: compute based on racks dimensions + nb racks / racks_per_row
  var canvas_width = 1480;
  var canvas_height = 950;
}

var nodes_per_rack = 72;
var nodes_per_row = 2;
var nodes_per_col = Math.floor(nodes_per_rack / nodes_per_row);
var node_margin = 1;
var node_width = Math.floor((rack_width - (2 * rack_border_width) - ((nodes_per_row * node_margin) + node_margin)) / nodes_per_row);
var node_height = Math.floor((rack_height - (2 * rack_border_width) - ((nodes_per_col * node_margin) + node_margin)) / nodes_per_col);
//var node_height = 10;

var node_state_height = node_height;
var node_state_width = 10;

/*
 * Colors
 */
var color_idle = "rgba(150,150,150,1)";
var color_fully_allocated = "rgba(0,91,154,1)";
var color_part_allocated = "rgba(86,128,184,1)";
var color_unavailable = "rgba(150,150,150,0.5)"; // idle but more transparent
var color_unknown = "rgba(39,39,39,1)";
var color_available = "green";
var color_drained = "yellow";
var color_down = "red";
var color_reserved = "blue";

var color_core_border = "rgba(100,100,100,1)";

var job_colors = [ "rgba(237,212,0,1)",  // normal yellow
                   "rgba(245,121,0,1)",  // normal orange
                   "rgba(193,125,17,1)", // normal brown
                   "rgba(115,210,22,1)", // normal green
                   "rgba(52,101,164,1)", // normal blue
                   "rgba(117,80,123,1)", // normal purple
                   "rgba(204,0,0,1)",    // normal red
                   "rgba(196,160,0,1)",  // dark yellow
                   "rgba(206,92,0,1)",   // dark orange
                   "rgba(143,89,2,1)",   // dark brown
                   "rgba(78,154,6,1)",   // dark green
                   "rgba(32,74,135,1)",  // dark blue
                   "rgba(92,53,102,1)",  // dark purple
                   "rgba(164,0,0,1)" ];  // dark red

/*
 * Functions
 */

function init_cluster() {
  $.ajaxSetup({ async: false });
  $.getJSON(api_dir + "/cluster",
    function(xcluster) {
      cluster = xcluster;
      if (cluster["name"]) {
        title = cluster["name"].capitalize() + "'s Slurm HPC Dashboard";
        document.title = title;
        $('#brand-name').text(title);
      }
    }
  );
  $.ajaxSetup({ async: true });
}

function get_rack_abs_coord(rack) {

  if (multi_canvas) {
    rack_coord_x = 0;
    rack_coord_y = 0;
  } else {
    rack_coord_x = rack['posx'];
    rack_coord_y = rack['posy'];
    //console.log("rack: " + rack['name'] + " -> " + rack_coord_x + "/" + rack_coord_y);
  }
  rack_abs_x = left_margin + (rack_coord_x * (rack_width + rack_horz_margin));
  rack_abs_y = top_margin + (rack_coord_y * (rack_height + rack_vert_margin));

  return [rack_abs_x, rack_abs_y];
}

function draw_rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function draw_rect_bdr(ctx, x, y, width, height, border_width, color_fill, color_border) {
  ctx.beginPath();
  ctx.rect(x-0.5, y-0.5, width, height); // start at .5 to avoid border blurred on 2 sub-pixels
  ctx.fillStyle = color_fill;
  ctx.fill();
  ctx.lineWidth = border_width;
  ctx.strokeStyle = color_border;
  ctx.stroke();
  //console.log("draw_rect_bdr: x:" + x + " y:" + y + " width: " + width + " height:" + height + " border:" + border_width);
}

function draw_rack(rack) {

  if (multi_canvas) {
    var ctx = document.getElementById("cv_rackmap_"+rack['name']).getContext("2d");
  } else {
    var ctx = document.getElementById("cv_rackmap").getContext("2d");
  }

  rack_abs = get_rack_abs_coord(rack);
  rack_abs_x = rack_abs[0];
  rack_abs_y = rack_abs[1];

  // global rect for whole rack (except floor and feet)
  draw_rect(ctx, rack_abs_x, rack_abs_y, rack_width, rack_height, "rgba(89,89,89,1)");
  // rack borders
  draw_rect_bdr(ctx, rack_abs_x, rack_abs_y, rack_border_width, rack_height, 1, "rgba(141,141,141,1)", "rgba(85,85,85,1)");
  draw_rect_bdr(ctx, rack_abs_x + rack_width - rack_border_width, rack_abs_y, rack_border_width, rack_height, 1, "rgba(141,141,141,1)", "rgba(85,85,85,1)");
  draw_rect_bdr(ctx, rack_abs_x + rack_border_width, rack_abs_y, rack_width - (2 * rack_border_width), rack_border_width, 1, "rgba(141,141,141,1)", "rgba(85,85,85,1)");
  draw_rect_bdr(ctx, rack_abs_x + rack_border_width, rack_abs_y + rack_height - rack_border_width, rack_width - (2 * rack_border_width), rack_border_width, 1, "rgba(141,141,141,1)", "rgba(85,85,85,1)");
  // rack floor
  draw_rect_bdr(ctx, rack_abs_x, rack_abs_y + rack_height, rack_width, floor_width, 1, "rgba(89,89,89,1)", "rgba(39,39,39,1)");
  // rack foots
  draw_rect_bdr(ctx, rack_abs_x, rack_abs_y + rack_height + floor_width, foot_width, foot_height, 1, "rgba(49,49,49,1)", "rgba(39,39,39,1)");
  draw_rect_bdr(ctx, rack_abs_x + rack_width - foot_width, rack_abs_y + rack_height + floor_width, foot_width, foot_height, 1, "rgba(49,49,49,1)", "rgba(39,39,39,1)");

  // rack name
  ctx.font = "14px sans-serif";
  ctx.fillText("rack " + rack.name, rack_abs_x + 60, rack_abs_y - 3);
  ctx.font = "10px sans-serif"; // back to default
}

function draw_led(ctx, x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
}

function pick_job_color(job_id) {
  var nb_colors = job_colors.length;
  color = job_colors[job_id % nb_colors];
  //console.log("job color: "+ color);
  return color;
}

function get_node_colors(slurmnode) {

  var state_color = color_idle;
  var node_color = color_unknown;

  if (slurmnode == null) {
      return [ node_color, null ];
  }

  /* node state */
  switch(slurmnode.node_state) {
    case 'IDLE':
    case 'IDLE*':
      state_color = color_available;
      node_color = color_idle;
      break;
    case 'ALLOCATED':
    case 'ALLOCATED*':
    case 'COMPLETING':
    case 'COMPLETING*':

      /*
       * Check whether the node is fully allocated of not (aka. mix state).
       * For this check, we compare total_cpus (which decreases down to -cpus)
       * as long as cores are allocated on the node. When total_cpus is equal
       * to -cpus, the node can be considered as fully allocated.
       */
      fully_allocated = slurmnode.total_cpus == -slurmnode.cpus ? true:false;
      state_color = color_available;
      if (fully_allocated) {
        node_color = color_fully_allocated;
      } else {
        node_color = color_part_allocated;
      }
      break;
    case 'RESERVED':
      fully_allocated = slurmnode.total_cpus == -slurmnode.cpus ? true:false;
      state_color = color_reserved;
      if (fully_allocated) {
        node_color = color_fully_allocated;
      } else {
        node_color = color_part_allocated;
      }
      break;
    case 'DRAINING':
    case 'DRAINING*':
    case 'DRAINED':
    case 'DRAINED*':
      state_color = color_drained;
      node_color = color_unavailable;
      break;
    case 'DOWN':
    case 'DOWN*':
      state_color = color_down;
      node_color = color_unavailable;
      break;
    default:
      console.log("node: " + slurmnode.name + " -> state: " + slurmnode.node_state);
      state_color = "black"
      node_color = color_unknown;
  }

  return [ node_color, state_color ];

}

function write_node_name(ctx, nodename, ndode_abs_x, node_abs_y, node_height, node_width) {
  /* add node name */
  ctx.fillStyle = "black";
  if (node_coord_x == 0) {
    ctx.fillText(nodename, node_abs_x - 55, node_abs_y + node_height - 3);
  } else {
    ctx.fillText(nodename, node_abs_x + node_width + rack_border_width + 3, node_abs_y + node_height - 3);
  }
}

function factors(num) {

  var n_factors = [], i;

  for (i = 1; i <= Math.floor(Math.sqrt(num)); i += 1)
    if (num % i === 0) {
      n_factors.push([i,num/i]);
    }

  n_factors.sort( function(a, b) { return a[0] - b[0];} );  // numeric sort
  return n_factors;

}

function best_factor(node_width, node_height, nb_cores) {

  if (nb_cores == 0) {
      return [ null, null ];
  }

  var all_factors = factors(nb_cores)
  var goal_ratio = (node_width - 20) / (node_height - 4);
  var ratio = -1, best_ratio = -1;
  var best_factor_id = 0;

  for (var i = 0; i < all_factors.length; i++) {
    ratio = all_factors[i][1] / all_factors[i][0];
    //console.log("%d/%d: ratio: %f best_ratio: %f", all_factors[i][1], all_factors[i][0], ratio, best_ratio);
    if (Math.abs(ratio-goal_ratio) < Math.abs(best_ratio-goal_ratio)) {
      best_ratio = ratio;
      best_factor_id = i;
    }
  }

  return all_factors[best_factor_id];

}

function get_core_abs_coords(node_width, node_height, node_abs_x, node_abs_y, core_id, cores_rows, cores_cols, core_size) {
  var core_x = Math.floor(core_id / cores_rows);
  var core_y = Math.floor(core_id % cores_rows);

  //console.log("node_abs_x: " + node_abs_x + " node_width: " + node_width + " cores_rows: " + cores_rows + " core_size: " + core_size)
  var core_x_orig = (node_abs_x + node_width) - (cores_cols * core_size) - 2;
  var core_y_orig = node_abs_y + Math.round((node_height - (cores_rows * core_size)) / 2);
  var core_abs_x = core_x_orig + (core_x * core_size);
  var core_abs_y = core_y_orig + (core_y * core_size);
  return [ core_abs_x, core_abs_y ];
}

function draw_node_cores(rack, racknode, slurmnode, allocated_cpus) {

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

  /* draw idle cores */
  for (; core_id < cores_nb; core_id++) {
    //console.log("node %s: core %d: x: %f, y: %f, abs_x: %f, abs_y: %f", slurmnode.name, core_id, core_x, core_y, core_abs_x, core_abs_y);
    core_coords = get_core_abs_coords(node_width, node_height, node_abs_x, node_abs_y, core_id, cores_rows, cores_cols, core_size);
    core_abs_x = core_coords[0];
    core_abs_y = core_coords[1];
    draw_rect_bdr(ctx, core_abs_x, core_abs_y, core_size, core_size, 1, color_idle, color_core_border);
  }

  /* write node name */
  write_node_name(ctx, racknode.name, node_abs_x, node_abs_y, node_height, node_width);

}

function build_allocated_cpus(jobs) {

  var allocated_cpus = {};
  var nodes_cpus = null;

  // build hash with this format:
  //   allocated_cpus['node'] = { "jobid1": nb_cores, "jobid2" : nb_cores }
  for (var job in jobs) {
    if (jobs.hasOwnProperty(job)) {
      if (jobs[job]['job_state'] == 'RUNNING') {
        nodes_cpus = jobs[job]['cpus_allocated'];
        for (var node in nodes_cpus) {
          if (!allocated_cpus.hasOwnProperty(node)) {
            allocated_cpus[node] = {};
          }
          allocated_cpus[node][job] = nodes_cpus[node];
        }
      }
    }
  }

  return allocated_cpus;

}
