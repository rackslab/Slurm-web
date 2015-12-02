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
  'text!/slurm-web-conf/topology.config.json'
], function (config) {
  var config = JSON.parse(config);

  function Graph(topology) {
    this.nodes = [];
    this.links = [];

    this.createSwitch = function(data) {
      data.group = data.level + 3;
      data.index = this.nodes.length;
      this.nodes.push({
        name: data.name,
        group: data.group,
        nodeClass: 'switch',
        size: config.SWITCHRADIUS
      });

      if (data.level === 0) {
        this.nodes[data.index].nodeset = data.nodeset;
        this.nodes[data.index].nodes = data.nodes;

        data.d3nodes = [];
        for (var id in this.nodes[data.index].nodes) {
          var node = {
            name: this.nodes[data.index].nodes[id].name,
            group: 1,
            nodeClass: 'slurmnode',
            index: this.nodes.length,
            size: config.NODERADIUS
          }
          data.d3nodes.push(node);
          this.nodes.push(node);
        }

        var nodeset = {
          name: data.nodeset.join(),
          group: 2,
          nodeClass: 'nodeset',
          nodes: data.d3nodes,
          size: config.NODESETRADIUS
        };
        this.nodes[data.index].nodesetIndex = data.nodesetIndex = this.nodes.length;
        this.nodes.push(nodeset);
        data.d3nodeset = nodeset;
      }

      return data;
    };

    this.createEdges = function() {
      for (var i = 0; i < topology.levels; i++) {
        var switches = topology.switches['level-' + i];

        for (var id in switches) {
          var s = switches[id],
              linkedElements = s.level ? s.switches : {};

          // if (s.computed) break;

          for (var id in linkedElements) {
            var linkedElement = s.level ? topology.switches['level-' + (s.level - 1)][id] : topology.nodes[id];

            if (s.index != undefined && linkedElement.index != undefined) {
              this.links.push({
                source: s.index,
                target: linkedElement.index,
                value: 1,
                linkClass: 'link-switch-' + s.name
              });
            }
          }

          if (s.index != undefined && s.nodesetIndex) {
            this.nodes[s.nodesetIndex].links = [];
            this.links.push({
              source: s.index,
              target: s.nodesetIndex,
              value: 1,
              linkClass: 'link-nodeset-' + s.name
            });

            for (var index = 0; index < s.d3nodes.length; index++) {
              var link = {
                source: s.nodesetIndex,
                target: s.d3nodes[index].index,
                value: 1,
                linkClass: 'link-node link-nodes-' + s.name
              };
              this.links.push(link);
              this.nodes[s.nodesetIndex].links.push(link);
            }
          }

          s.computed = true;
        }
      }
    }

    this.createGraph = function() {
      var levels = topology.levels,
          switches = topology.switches;

      // generate switches
      for (var i = 0; i < levels; i++) {
        var curSwitches = switches['level-' + i];

        for (var id in curSwitches) {
          this.createSwitch(curSwitches[id]);
        }
      }

      this.createEdges();

      return this;
    };
  }

  function Topology(topology) {
    this.config = config;
    this.rawDatas = topology;
    this.nodes = {};

    function pad(num, size) {
      var s = num + '';
      while (s.length < size) s = '0' + s;
      return s;
    }

    function groupsToElements(groups) {
      var result = [],
          regexOne = /\w+\d+/,
          regexGroup = /(\w+)\[(\d+)\-(\d+)\]/;

      for (var i in groups) {
        var matchOne = groups[i].match(regexOne),
            matchGroup = groups[i].match(regexGroup);
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

    function normalizeSwitchesSyntax(switches) {
      var regexGroup = /(\w+)\[(\d+)\-(\d+)\]/,
          regexBeginOfGroup = /(\w+)\[(\d+)\-(\d+)/,
          regexMiddleOfGroup = /(\d+)\-(\d+)/,
          regexEndOfGroup = /(\d+)\-(\d+)\]/,
          currentGroup = null,
          result = [];

      for (var i in switches) {
        var matchGroup = switches[i].match(regexGroup),
            matchBeginOfGroup = switches[i].match(regexBeginOfGroup),
            matchMiddleOfGroup = switches[i].match(regexMiddleOfGroup),
            matchEndOfGroup = switches[i].match(regexEndOfGroup);

        if (matchGroup) {
          result.push(switches[i]);
        } else if (matchBeginOfGroup) {
          result.push(switches[i] + ']');
          currentGroup = matchBeginOfGroup[1];
        } else if (matchMiddleOfGroup && currentGroup) {
          result.push(currentGroup + '[' + switches[i] + ']');
        } else if (matchEndOfGroup && currentGroup) {
          result.push(currentGroup + '[' + switches[i]);
          currentGroup = null;
        } else {
          throw ('Bad format for switches with : ' + groups[i]);
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
        switches[level][id].type = 'switch';

        var nodesChildren = groupsToElements(datas[id].nodes),
            switchesChildren = groupsToElements(normalizeSwitchesSyntax(datas[id].switches));

        datas[id].nodeset = datas[id].nodes;
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
    this.graph = (new Graph(this)).createGraph();
  }

  return Topology;
});
