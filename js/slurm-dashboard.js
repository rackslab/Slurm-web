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
  $("#listresv").empty();
  $("#racks").hide();
  $("#reservations").hide();
  $("#jobs").show();
  load_jobs();
  clearInterval(interval_handler);
  interval_handler = window.setInterval(load_jobs, refresh);
}

function show_modal_job(job_id) {

  $.getJSON(api_dir + "/job/" + job_id,
    function(job) {
      $('#modal-job-title').text("job " + job_id);

      start_time = new Date(job.start_time*1000);
      eligible_time = new Date(job.eligible_time*1000);
      end_time = new Date(job.end_time*1000);

      state_reason = job.state_reason == 'None' ? "-":job.state_reason;
      command = job.command == null ? "-":job.command;
      exclusive = job.shared == 0 ? "yes":"no";

      job_details = "<ul>"
                  + "<li>user: " + job.login + " (" + job.username + ")</li>"
                  + "<li>state: " + job.job_state + "</li>"
                  + "<li>reason: " + state_reason + "</li>"
                  + "<li>nodes: " + job.nodes + " (" + job.num_nodes + ")</li>"
                  + "<li>cores: " + job.num_cpus + "</li>"
                  + "<li>account: " + job.account + "</li>"
                  + "<li>QOS: " + job.qos + "</li>"
                  + "<li>partition: " + job.partition + "</li>"
                  + "<li>exclusive: " + exclusive + "</li>"
                  + "<li>command: " + command + "</li>"
                  + "<li>start time: " + start_time + "</li>"
                  + "<li>eligible time: " + eligible_time + "</li>"
                  + "<li>end time: " + end_time + "</li>"
                  + "<li>time limit: " + job.time_limit + " mins</li>"
                  + "</ul>";
      $('#modal-job-body').empty();
      $('#modal-job-body').append(job_details);
      $('#modal-job').modal('show');
    }
  );

}

function load_jobs() {

  var cluster = null;

  $.ajaxSetup({ async: false });

  $.getJSON(api_dir + "/cluster",
    function(xcluster) {
      cluster = xcluster;
    }
  );

  $.ajaxSetup({ async: true });

  $.getJSON(api_dir + "/jobs",
    function(jobs) {

      var plotsholder =
        "<div id='alloc-cores' class='col-xs-6 col-sm-4 placeholder'> \
           <div class='plot-sub-div'> \
             <div id='plot-alloc-cores' class='plot-div'></div> \
           </div> \
           <h4>Allocated cores</h4> \
         </div> \
        <div id='part-nodes' class='col-xs-6 col-sm-2 placeholder'> \
           <div class='plot-sub-div'> \
             <div id='plot-part-nodes' class='plot-div-small'></div> \
           </div> \
           <h4>Nodes/Partition</h4> \
         </div> \
         <div id='part-cores' class='col-xs-6 col-sm-2 placeholder'> \
           <div class='plot-sub-div'> \
             <div id='plot-part-cores' class='plot-div-small'></div> \
           </div> \
           <h4>Cores/Partition</h4> \
         </div> \
         <div id='qos-nodes' class='col-xs-6 col-sm-2 placeholder'> \
           <div class='plot-sub-div'> \
             <div id='plot-qos-nodes' class='plot-div-small'></div> \
           </div> \
           <h4>Nodes/QOS</h4> \
         </div> \
         <div id='qos-cores' class='col-xs-6 col-sm-2 placeholder'> \
           <div class='plot-sub-div'> \
             <div id='plot-qos-cores' class='plot-div-small'></div> \
           </div> \
           <h4>Cores/QOS</h4> \
         </div>";

      $("#plotjobs").empty();
      $("#plotjobs").append(plotsholder);

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
                  <th>Start</th>                \
                  <th>QOS</th>                  \
                  <th>Partition</th>            \
                </tr>                           \
              </thead>                          \
              <tbody id='jobs-tbody'/>          \
            </table>                            \
          </div>";
      $("#listjobs").empty();
      $("#listjobs").append(table_header);

      var qosstats = {};
      var partstats = {};
      var nb_alloc_cores = 0;

      $.each(jobs,
        function(id,job) {
          if (job.nodes == null) {
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

          /* compute stats about part and qos */
          if (job.job_state == "RUNNING" || job.job_state == "COMPLETED") {

            if (qosstats.hasOwnProperty(job.qos)) {
              qosstats[job.qos]['cores'] += job.num_cpus;
              qosstats[job.qos]['nodes'] += job.num_nodes;
            } else {
              qosstats[job.qos] = {};
              qosstats[job.qos]['cores'] = job.num_cpus;
              qosstats[job.qos]['nodes'] = job.num_nodes;
            }

            if (partstats.hasOwnProperty(job.partition)) {
              partstats[job.partition]['cores'] += job.num_cpus;
              partstats[job.partition]['nodes'] += job.num_nodes;
            } else {
              partstats[job.partition] = {};
              partstats[job.partition]['cores'] = job.num_cpus;
              partstats[job.partition]['nodes'] = job.num_nodes;
            }
            nb_alloc_cores += job.num_cpus
          }

          if (job.job_state == 'PENDING' && job.start_time > 0) {
              starttime = new Date(job.start_time*1000);
          } else {
              starttime = '-';
          }


          var html_job = "<tr class='job-row' id='tr-job-" + id + "'>"
                        + "<td>" + id + "</td><td>"
                        + job.login + " (" + job.username + ")</td><td>"
                        + nodes + "</td><td>"
                        + job.job_state + "</td><td>"
                        + reason + "</td><td>"
                        + starttime + "</td><td>"
                        + job.qos + "</td><td>"
                        + job.partition + "</td></tr>";
          $("#jobs-tbody").append(html_job);
          $("#tr-job-" + id).click(function() { show_modal_job(id); });
        }
      );

      data_alloc_cores = [ { label: 'allocated', data: nb_alloc_cores },
                           { label: 'idle'     , data: cluster.cores-nb_alloc_cores } ]

      data_qos_nodes = []
      data_qos_cores = []

      for (var qos in qosstats) {
        // use hasOwnProperty to filter out keys from the Object.prototype
        if (qosstats.hasOwnProperty(qos)) {
          data_qos_nodes.push({ label: qos, data: qosstats[qos]['nodes'] })
          data_qos_cores.push({ label: qos, data: qosstats[qos]['cores'] })
        }
      }

      data_part_nodes = []
      data_part_cores = []

      for (var part in partstats) {
        // use hasOwnProperty to filter out keys from the Object.prototype
        if (partstats.hasOwnProperty(part)) {
          data_part_nodes.push({ label: part, data: partstats[part]['nodes'] })
          data_part_cores.push({ label: part, data: partstats[part]['cores'] })
        }
      }

      var plot_params =
        {
          series: {
            pie: {
              show: true,
            }
          }
        };
      $.plot('#plot-alloc-cores', data_alloc_cores, plot_params);
      $.plot('#plot-part-nodes', data_part_nodes, plot_params);
      $.plot('#plot-part-cores', data_part_cores, plot_params);
      $.plot('#plot-qos-nodes', data_qos_nodes, plot_params);
      $.plot('#plot-qos-cores', data_qos_cores, plot_params);

    }
  );
}

/* not used anymore */
function show_nodes() {
  $("#plotjobs").empty();
  $("#listjobs").empty();
  $("#rackmap").empty();
  $("#listresv").empty();
  $("#jobs").hide();
  $("#racks").hide();
  $("#reservations").hide();
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
  $("#plotjobs").empty();
  $("#listjobs").empty();
  $("#listnodes").empty();
  $("#listresv").empty();
  $("#jobs").hide();
  $("#reservations").hide();
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
      state_color = "green";
      if (fully_allocated) {
        node_color = color_fully_allocated;
      } else {
        node_color = color_part_allocated;
      }
      break;
    case 'DRAINED':
    case 'DRAINED*':
      state_color = "yellow";
      node_color = color_unavailable;
      break;
    case 'DOWN':
    case 'DOWN*':
      state_color = "red";
      node_color = color_unavailable;
      break;
    default:
      console.log("node_id: " + id_node + " -> state: " + slurmnode.node_state);
      state_color = "black"
      node_color = color_unknown;
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
    legend_x = 10;
    legend_y = 15;
  } else {
    var ctx = document.getElementById("cv_rackmap").getContext("2d");
    legend_x = canvas_width - 80;
    legend_y = canvas_height - 50;
  }

  draw_rect_bdr(ctx, 1, 1, 98, 75, 1, "rgba(255,255,255,1)", "rgba(200,200,200,1)");

  ctx.fillStyle = "black";
  ctx.font = "12px sans-serif";
  ctx.fillText("node state:", legend_x-3, legend_y);
  ctx.font = "10px sans-serif"; // back to default

  draw_led(ctx, legend_x + 1, legend_y + 10, "green");
  ctx.fillStyle = "black";
  ctx.fillText("available", legend_x + 10, legend_y + 13);
  draw_led(ctx, legend_x + 1, legend_y + 20, "yellow");
  ctx.fillStyle = "black";
  ctx.fillText("drained", legend_x + 10, legend_y + 23);
  draw_led(ctx, legend_x + 1, legend_y + 30, "red");
  ctx.fillStyle = "black";
  ctx.fillText("down", legend_x + 10, legend_y + 33);

  draw_rect(ctx, legend_x-2, legend_y+35, 9, 9, color_fully_allocated);
  ctx.fillStyle = "black";
  ctx.fillText("fully allocated", legend_x + 10, legend_y + 43);
  draw_rect(ctx, legend_x-2, legend_y+45, 9, 9, color_part_allocated);
  ctx.fillStyle = "black";
  ctx.fillText("partly allocated", legend_x + 10, legend_y + 53);

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
        var html_rackmap = "<canvas style='position:absolute;top:55px;right:180px;'" +
                           " id='cv_rackmap_legend'" +
                           " width='" + canvas_legend_width +
                           "' height='" + canvas_legend_height + "'/>";
        $("#rackmap").prepend(html_rackmap);

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

function show_reservations() {
  $("#plotjobs").empty();
  $("#listjobs").empty();
  $("#listnodes").empty();
  $("#rackmap").empty();
  $("#jobs").hide();
  $("#racks").hide();
  $("#reservations").show();
  load_reservations();
  clearInterval(interval_handler);
  interval_handler = window.setInterval(load_reservations, refresh);
}

function load_reservations() {

  $.getJSON(api_dir + "/reservations",
    function(reservations) {

      var table_header =
          "<div class='table-responsive'>       \
            <table class='table table-striped'> \
              <thead>                           \
                <tr>                            \
                  <th>Name</th>                 \
                  <th>Users</th>                \
                  <th>Nodes</th>                \
                  <th>Start</th>                \
                  <th>End</th>                  \
                </tr>                           \
              </thead>                          \
              <tbody id='resv-tbody'/>          \
            </table>                            \
          </div>";
      $("#listresv").empty();
      $("#listresv").append(table_header);

      $.each(reservations,
        function(reservation_name, reservation) {

          starttime = new Date(reservation.start_time * 1000);
          endtime = new Date(reservation.end_time * 1000);

          var html_job = "<tr><td>" + reservation_name + "</td><td>"
                        + reservation.users + "</td><td>"
                        + reservation.node_list + "</td><td>"
                        + starttime + "</td><td>"
                        + endtime + "</td></tr>";
          $("#resv-tbody").append(html_job);

        }
      );

    }
  );
}
