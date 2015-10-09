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
  'text!../config/topology.config.json'
], function (config) {
  function Graph(topology) {
    this.config = JSON.parse(config);

    // data: { text, x, y }
    this.createSVGElement = function(data, options) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", 'g'),
          box = document.createElementNS("http://www.w3.org/2000/svg", 'rect'),
          text = document.createElementNS("http://www.w3.org/2000/svg", 'text'),
          tspan = document.createElementNS("http://www.w3.org/2000/svg", 'tspan');

      for (var attribute in options.G.ATTRIBUTES) {
        g.setAttribute(attribute, options.G.ATTRIBUTES[attribute]);
      }
      g.setAttribute('data-id', data.name);

      for (var attribute in options.BOX.ATTRIBUTES) {
        box.setAttribute(attribute, options.BOX.ATTRIBUTES[attribute]);
      }
      box.setAttribute('x', data.x - options.BOX.ATTRIBUTES.width / 2);
      box.setAttribute('y', data.y);

      for (var attribute in options.TEXT.ATTRIBUTES) {
        text.setAttribute(attribute, options.TEXT.ATTRIBUTES[attribute]);
      }
      text.setAttribute('x', data.x);
      text.setAttribute('y', data.y + options.BOX.ATTRIBUTES.height / 2);
      text.appendChild(document.createTextNode(data.name));

      g.appendChild(box);
      g.appendChild(text);
      data.html = g;

      return data;
    };

    this.createNode = function(data) {
      return this.createSVGElement(data, this.config.NODES);
    };

    this.createSwitch = function(data) {
      var linkedElements = data.level ? data.switches : data.nodes,
          params = this.config.GRAPH,
          nodeParams = this.config.NODES,
          nodesLength = Object.keys(topology.nodes).length,
          minChildX = 0,
          maxChildX = nodesLength * (nodeParams.BOX.ATTRIBUTES.width + 2 * nodeParams.BOX.MARGINX) + 2 * params.PADDINGX;


      for (var id in linkedElements) {
        var linkedElement = data.level ? topology.switches['level-' + (data.level - 1)][id] : topology.nodes[id];

        minChildX = Math.max(minChildX, linkedElement.x);
        maxChildX = Math.min(maxChildX, linkedElement.x);
      }

      data.x = (minChildX + maxChildX) / 2;
      this.preventClash(data);
      data = this.createSVGElement(data, this.config.SWITCHES);

      return data;
    };

    this.preventClash = function(data) {
      var switches = topology.switches['level-' + data.level],
          params = this.config.SWITCHES,
          width = params.BOX.ATTRIBUTES.width,
          marginX = params.BOX.MARGINX,
          spacing = width + marginX;

      for (var id in switches) {
        var s = switches[id];
        if (s.name == data.name || !s.x) {
          break;
        }

        if (data.x > s.x - spacing && data.x < s.x + spacing) {
          var difference = (data.x - s.x);

          if (difference >= 0) {
            data.x = data.x + spacing - difference;
          } else {
            data.x = data.x - spacing + difference;
          }
        }
      }
    }

    this.createEdges = function() {
      for (var i = 0; i < topology.levels; i++) {
        var switches = topology.switches['level-' + i];

        for (var id in switches) {
          var s = switches[id],
              linkedElements = s.level ? s.switches : s.nodes;

          for (var id in linkedElements) {
            var line = document.createElementNS("http://www.w3.org/2000/svg", 'line'),
                linkedElement = s.level ? topology.switches['level-' + (s.level - 1)][id] : topology.nodes[id];

            line.setAttribute('x1', s.x);
            line.setAttribute('y1', s.y + this.config.SWITCHES.BOX.ATTRIBUTES.height);
            line.setAttribute('x2', linkedElement.x);
            line.setAttribute('y2', linkedElement.y);
            line.setAttribute('class', 'link');

            s.html.appendChild(line);
          }
        }
      }
    }

    this.createGraph = function() {
      var params = this.config.GRAPH,
          nodeParams = this.config.NODES,
          switchParams = this.config.SWITCHES,
          levels = topology.levels,
          nodes = topology.nodes,
          nodesLength = Object.keys(nodes).length,
          switches = topology.switches,
          width = nodesLength * (nodeParams.BOX.ATTRIBUTES.width + 2 * nodeParams.BOX.MARGINX) + 2 * params.PADDINGX,
          height = levels * (switchParams.BOX.ATTRIBUTES.height + params.ROWSPACING) + nodeParams.BOX.ATTRIBUTES.height + 2 * params.PADDINGY,
          currentX = params.PADDINGX,
          currentY = height - params.PADDINGY,
          graph = document.createElementNS("http://www.w3.org/2000/svg", 'svg');

      // generate nodes
      currentY -= nodeParams.BOX.ATTRIBUTES.height;
      for (var id in nodes) {
        nodes[id].text = nodes[id].name;
        nodes[id].x = currentX + nodeParams.BOX.ATTRIBUTES.width / 2 + nodeParams.BOX.MARGINX;
        nodes[id].y = currentY;
        nodes[id].html = this.createNode(nodes[id]).html;
        graph.appendChild(nodes[id].html)
        currentX += nodeParams.BOX.ATTRIBUTES.width + 2 * nodeParams.BOX.MARGINX;
      }

      // generate switches
      for (var i = 0; i < levels; i++) {
        var curSwitches = switches['level-' + i],
            switchesLength = Object.keys(curSwitches).length,
            switchesInterval = (width - 2 * params.PADDINGX) / switchesLength;
        currentY -= params.ROWSPACING + switchParams.BOX.ATTRIBUTES.height;
        currentX = params.PADDINGX + switchesInterval / 2;

        for (var id in curSwitches) {
          curSwitches[id].text = curSwitches[id].name;
          curSwitches[id].y = currentY;
          curSwitches[id].html = this.createSwitch(curSwitches[id]).html;
          graph.appendChild(curSwitches[id].html)
          currentX += switchesInterval;
        }
      }

      this.createEdges();

      for (var attribute in params.ATTRIBUTES) {
        graph.setAttribute(attribute, params.ATTRIBUTES[attribute]);
      }
      graph.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      graph.setAttribute('width', width);
      graph.setAttribute('height', height);


      return {
        html: graph
      }
    };
  }

  function Topology(topology) {
    var self = this;
    this.rawDatas = topology;
    this.nodes = {};

    function pad(num, size) {
      var s = num + "";
      while (s.length < size) s = "0" + s;
      return s;
    }

    function groupsToElements(groups) {
      var result = [],
          regexOne = /\w+\d+/,
          regexGroup = /(\w+)\[(\d+)\-(\d+)\]/;

      for (var i in groups) {
        var matchOne = groups[i].match(regexOne),
            matchGroup =groups[i].match(regexGroup);
        if (!matchOne && !matchGroup) {
          throw ('Bad format with : ' + groups[i]);
        }

        if (matchGroup) {
          var name = matchGroup[1],
              start = parseInt(matchGroup[2]),
              end = parseInt(matchGroup[3]),
              size = matchGroup[2].length;

          for (var i = start; i <= end; i++) {
            result.push(name + pad(i, size));
          }
        } else {
          result.push(groups[i]);
        }
      }

      return result;
    }

    this.topologyToSwitches = function() {
      var graph = {},
          switches = {},
          datas = this.rawDatas;

      for (var id in datas) {
        var level = 'level-' + datas[id].level;
        if (!switches[level]) {
          switches[level] = {};
        }

        switches[level][id] = datas[id];
        switches[level][id].name = id;
        switches[level][id].type = "switch";

        var nodesChildren = groupsToElements(datas[id].nodes),
            switchesChildren = groupsToElements(datas[id].switches);

        switches[level][id].nodes = {};
        for (var i in nodesChildren) {
          switches[level][id].nodes[nodesChildren[i]] = {
            name: nodesChildren[i],
            type: 'node'
          };
          this.nodes[nodesChildren[i]] = switches[level][id].nodes[nodesChildren[i]];
        }

        switches[level][id].switches = {};
        for (var i in switchesChildren) {
          switches[level][id].switches[switchesChildren[i]] = {
            name: switchesChildren[i],
            type: 'switch'
          };
        }
      }

      return switches;
    }

    this.switches = this.topologyToSwitches();
    this.levels = Object.keys(this.switches).length;
    this.Graph = new Graph(this);
    this.graph = this.Graph.createGraph();
  }

  return Topology;
});
