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

var refresh = 30 * 1000;
var interval_handler = 0;

var api_dir = "/slurm-restapi";

var canvas_width = 1480;
var canvas_height = 950;

var left_margin = 60;
var top_margin = 2;
var rack_horz_margin = 100;
var rack_vert_margin = 30;
var rack_width = 190;
var rack_height = 453;
var rack_border_width = 10;

var nb_racks = 9;
var racks_per_row = 5;

var nodes_per_rack = 72;
var nodes_per_row = 2;
var nodes_per_col = Math.floor(nodes_per_rack / nodes_per_row);
var node_margin = 1;
var node_width = Math.floor((rack_width - (2 * rack_border_width) - ((nodes_per_row * node_margin) + node_margin)) / nodes_per_row);
var node_height = Math.floor((rack_height - (2 * rack_border_width) - ((nodes_per_col * node_margin) + node_margin)) / nodes_per_col);
//var node_height = 10;

var node_state_height = node_height;
var node_state_width = 10;

var job_colors = [ "rgba(105,138,188,1)",
                   "rgba(0,139,195,1)",
                   "rgba(42,96,108,1)",
                   "rgba(0,91,154,1)",
                   "rgba(0,86,139,1)",
                   "rgba(55,76,134,1)",
                   "rgba(20,83,81,1)",
                   "rgba(6,59,123,1)" ]

/*
 * Functions
 */

function show_jobs() {
  $("#listnodes").empty();
  $("#rackmap").empty();
  $("#racks").hide();
  $("#jobs").show();
  load_jobs();
  clearInterval(interval_handler);
  interval_handler = window.setInterval(load_jobs, refresh);
}

function load_jobs() {
  $.getJSON(api_dir + "/jobs",
    function(jobs) {
      $("#listjobs").empty();

      var table_header =
          "<div class='table-responsive'>       \
            <table class='table table-striped'> \
              <thead>                           \
                <tr>                            \
                  <th>#</th>                    \
                  <th>User</th>                 \
                  <th>Nodes</th>                \
                  <th>State</th>                \
                  <th>Reason</th>               \
                  <th>QOS</th>                  \
                  <th>Partition</th>            \
                </tr>                           \
              </thead>                          \
              <tbody id='jobs-tbody'/>          \
            </table>                            \
          </div>";
      $("#listjobs").append(table_header);

      $.each(jobs,
        function(id,job) {
          if (job.job_state == "PENDING") {
            nodes = "-";
          } else {
            nodes = job.nodes;
          }
          if (job.job_state == "RUNNING" || job.job_state == "COMPLETED") {
            reason = "-";
          } else {
            reason = job.state_reason;
          }

          var html_job = "<tr><td>" + id + "</td><td>"
                        + job.user_id + "</td><td>"
                        + nodes + "</td><td>"
                        + job.job_state + "</td><td>"
                        + reason + "</td><td>"
                        + job.qos + "</td><td>"
                        + job.partition + "</td></tr>";
          $("#jobs-tbody").append(html_job);
        }
      );

    }
  );
}

/* not used anymore */
function show_nodes() {
  $("#listjobs").empty();
  $("#rackmap").empty();
  $("#jobs").hide();
  $("#racks").hide();
  $("#nodes").show();
  load_nodes();
  clearInterval(interval_handler);
  interval_handler = window.setInterval(load_nodes, refresh);
}

/* not used anymore */
function load_nodes() {
  $.getJSON(api_dir + "/nodes",
    function(nodes) {
      $("#listnodes").empty();
      $.each(nodes,
        function(id,node) {
          var html_node = "<li class='node' id='node_" + id + "'>"
                           + id + "," + node.node_state + "</li>";
          $("#listnodes").append(html_node);
        }
      );
    }
  );
}

function show_racks() {
  $("#listjobs").empty();
  $("#listnodes").empty();
  $("#jobs").hide();
  $("#racks").show();
  load_racks();
  clearInterval(interval_handler);
  interval_handler = window.setInterval(load_racks, refresh);
}

function get_rack_abs_coord(id_rack) {
  rack_coord_x = id_rack % racks_per_row;
  rack_coord_y = Math.floor(id_rack / racks_per_row);
  //console.log("rack_id: " + id_rack + " -> " + rack_coord_x + "/" + rack_coord_y);

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

function draw_rack(ctx, id_rack) {
  rack_abs = get_rack_abs_coord(id_rack);
  rack_abs_x = rack_abs[0];
  rack_abs_y = rack_abs[1];

  draw_rect(ctx, rack_abs_x, rack_abs_y, rack_width, rack_height, "rgba(89,89,89,1)");

  floor_width = 5;
  foot_height = 3;
  foot_width = 7;
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

function draw_node(ctx, id_node, node) {

  node_rack = Math.floor(id_node / nodes_per_rack);
  id_node_in_rack = id_node % nodes_per_rack;

  /* relative coordinate of node inside the rack */
  node_coord_x = id_node_in_rack % nodes_per_row;
  node_coord_y = Math.floor(id_node_in_rack / nodes_per_row);

  rack_abs = get_rack_abs_coord(node_rack);
  rack_abs_x = rack_abs[0];
  rack_abs_y = rack_abs[1];

  /* TODO: check if start with bottom or top */
  node_abs_x = rack_abs_x + rack_border_width + node_margin + (node_coord_x * (node_width + node_margin));
  node_abs_y = rack_abs_y + rack_height - rack_border_width - (node_height + node_margin) - (node_coord_y * (node_height + node_margin));

  //console.log("node_id: " + id_node + " -> " + node_rack + "/" + id_node_in_rack + " -> coord:" + node_coord_x + "/" + node_coord_y + " abs: " + node_abs_x + "/" + node_abs_y);

  var state_color = "green";

  /* node state */
  switch(node.node_state) {
    case 'IDLE':
    case 'IDLE*':
      state_color = "green";
      node_color = "rgba(150,150,150,1)";
      break;
    case 'ALLOCATED':
    case 'ALLOCATED*':
      state_color = "green";
      node_color = pick_job_color(Math.abs(node.total_cpus));
      break;
    case 'DRAINED':
    case 'DRAINED*':
      state_color = "yellow";
      node_color = "rgba(150,150,150,0.5)";
      break;
    case 'DOWN':
    case 'DOWN*':
      state_color = "red";
      node_color = "rgba(150,150,150,0.5)";
      break;
    default:
      console.log("node_id: " + id_node + " -> state: " + node.node_state);
      state_color = "black"
      node_color = "rgba(39,39,39,1)";
  }

  /* node rectangle */
  draw_rect(ctx, node_abs_x, node_abs_y, node_width, node_height, node_color);

  /* draw status LED */
  draw_led(ctx, node_abs_x + 4, node_abs_y + 4, state_color);

  /* add node name */
  ctx.fillStyle = "black";
  if (node_coord_x == 0) {
    ctx.fillText(node.name, node_abs_x - 55, node_abs_y + node_height - 3);
  } else {
    ctx.fillText(node.name, node_abs_x + node_width + rack_border_width + 3, node_abs_y + node_height - 3);
  }

}

function draw_legend(ctx) {

  legend_x = canvas_width - 80;
  legend_y = canvas_height - 50;
  ctx.fillStyle = "black";
  ctx.fillText("node state:", legend_x, legend_y);
  draw_led(ctx, legend_x + 1, legend_y + 10, "green");
  ctx.fillStyle = "black";
  ctx.fillText("available", legend_x + 10, legend_y + 13);
  draw_led(ctx, legend_x + 1, legend_y + 20, "yellow");
  ctx.fillStyle = "black";
  ctx.fillText("drained", legend_x + 10, legend_y + 23);
  draw_led(ctx, legend_x + 1, legend_y + 30, "red");
  ctx.fillStyle = "black";
  ctx.fillText("down", legend_x + 10, legend_y + 33);
}

function load_racks() {
  $.getJSON(api_dir + "/nodes",
    function(nodes) {

      var html_rackmap = "<canvas id='cv_rackmap' width='" + canvas_width + "' height='" + canvas_height + "'/>"
      $("#rackmap").empty();
      $("#rackmap").append(html_rackmap);

      var c = document.getElementById("cv_rackmap");
      var ctx = c.getContext("2d");

      for (id_rack = 0; id_rack < nb_racks; id_rack++) {
        draw_rack(ctx, id_rack);
      }

      var id_node = 0;

      $.each(nodes,
        function(id,node) {
          draw_node(ctx, id_node, node);
          id_node++;
        }
      );

      draw_legend(ctx);
    }
  );
}
