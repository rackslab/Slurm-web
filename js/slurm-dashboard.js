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

// the maximum number of chars in nodesets in jobs view before being cut
var max_nodes_len = 25;

var left_margin = 60;
var top_margin = 10;
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
            // check nodeset length and cut it if too long
            if (job.nodes.length > max_nodes_len) {
                nodes = job.nodes.substring(0, max_nodes_len) + "...";
            } else {
                nodes = job.nodes;
            }
          }
          if (job.job_state == "RUNNING" || job.job_state == "COMPLETED") {
            reason = "-";
          } else {
            reason = job.state_reason;
          }

          var html_job = "<tr><td>" + id + "</td><td>"
                        + job.login + " (" + job.username + ")</td><td>"
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
  ctx.fillText("rack " + rack.name, rack_abs_x + 70, rack_abs_y - 3);
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

function draw_node(rack, racknode, slurmnode) {

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

  //console.log("node_id: " + id_node + " -> " + node_rack + "/" + id_node_in_rack + " -> coord:" + node_coord_x + "/" + node_coord_y + " abs: " + node_abs_x + "/" + node_abs_y);

  var state_color = "green";

  /* node state */
  switch(slurmnode.node_state) {
    case 'IDLE':
    case 'IDLE*':
      state_color = "green";
      node_color = "rgba(150,150,150,1)";
      break;
    case 'ALLOCATED':
    case 'ALLOCATED*':
    case 'COMPLETING':
    case 'COMPLETING*':
      state_color = "green";
      node_color = pick_job_color(Math.abs(slurmnode.total_cpus));
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
      console.log("node_id: " + id_node + " -> state: " + slurmnode.node_state);
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
    ctx.fillText(racknode.name, node_abs_x - 55, node_abs_y + node_height - 3);
  } else {
    ctx.fillText(racknode.name, node_abs_x + node_width + rack_border_width + 3, node_abs_y + node_height - 3);
  }

}

function draw_legend() {

  if (multi_canvas) {
    var ctx = document.getElementById("cv_rackmap_legend").getContext("2d");
  } else {
    var ctx = document.getElementById("cv_rackmap").getContext("2d");
  }

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

  slurmnodes = null;

  /*
   * The first ajax JSON call to /nodes must be done synchronously
   * to make sure slurmnodes variables is set before the async loop
   * after call to /racks is run.
   */
  $.ajaxSetup({ async: false });

  $.getJSON(api_dir + "/nodes",
    function(nodes) {
      slurmnodes = nodes;
    }
  );

  $.ajaxSetup({ async: true });

  $.getJSON(api_dir + "/racks",
    function(racks) {

      nb_racks = Object.keys(racks).length

      $("#rackmap").empty();

      if (multi_canvas) {
        $.each(racks,
          function(name, rack) {
            var html_rackmap = "<canvas id='cv_rackmap_" + name +
                               "' width='" + canvas_width +
                               "' height='" + canvas_height + "'/>";
            $("#rackmap").append(html_rackmap);
          }
        );
        var html_rackmap = "<canvas id='cv_rackmap_legend'" +
                           " width='" + canvas_width +
                           "' height='" + canvas_height + "'/>";
        $("#rackmap").append(html_rackmap);

      } else {
        var html_rackmap = "<canvas id='cv_rackmap'" +
                           " width='" + canvas_width +
                           "' height='" + canvas_height + "'/>";
        $("#rackmap").append(html_rackmap);
      }

      $.each(racks,
        function(id_rack, rack) {
          draw_rack(rack);
          $.each(rack.nodes,
            function(id_racknode,racknode) {
              draw_node(rack, racknode, slurmnodes[racknode.name]);
            }
          );
        }
      );

      draw_legend();

    }
  );
}
