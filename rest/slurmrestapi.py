#!flask/bin/python
# -*- coding: utf-8 -*-
#
# Copyright (C) 2015 EDF SA
#
# This file is part of slurm-web.
#
# slurm-web is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# slurm-web is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.

from flask import Flask, jsonify
import pyslurm
import xml.etree.ElementTree as ET
import pwd
from ClusterShell.NodeSet import NodeSet

app = Flask(__name__)

uids = {} # cache of user login/names to avoid duplicate NSS resolutions

@app.route('/jobs', methods=['GET'])
def get_jobs():
    jobs = pyslurm.job().get()

    # add login and username (additionally to UID) for each job
    for jobid, job in jobs.iteritems():
        fill_job_user(job)

    return jsonify(jobs)

@app.route('/job/<int:job_id>')
def show_job(job_id):
    job = pyslurm.job().find_id(job_id)
    fill_job_user(job)
    return jsonify(job)

@app.route('/nodes', methods=['GET'])
def get_nodes():
    nodes = pyslurm.node().get()
    return jsonify(nodes)

@app.route('/cluster', methods=['GET'])
def get_cluster():
    nodes = pyslurm.node().get()
    cluster = {}
    cluster['nodes'] = len(nodes.keys())
    cluster['cores'] = 0
    for nodename, node in nodes.iteritems():
        cluster['cores'] += node['cores']
    return jsonify(cluster)

@app.route('/racks', methods=['GET'])
def get_racks():
    racks = parse_racks()
    return jsonify(racks)

@app.route('/reservations', methods=['GET'])
def get_reservations():
    reservations = pyslurm.reservation().get()
    return jsonify(reservations)

class NodeType(object):

    def __init__(self, name, model, height, width):
        self.name = name
        self.model = model
        self.height = height
        self.width = width

class Rack(object):

    def __init__(self, name, posx, posy):
        self.name = name
        self.posx = posx
        self.posy = posy
        self.nodes = [] # list of nodes in the rack

    def __repr__(self):

        rackrepr = "rack %s (posx: %d, posy: %d):\n" % (self.name, self.posx, self.posy)
        for node in self.nodes:
            rackrepr += " - %s\n" % (str(node))
        return rackrepr

    def _sort_nodes(self):
        self.nodes.sort(key=lambda node: node.name)

    def map_nodes(self):
        self._sort_nodes()

        # list of nodes widths in one row
        nodes_posx_one_row = []

        node_1st_row = None
        node_2nd_row = None
        node_id = 0
        for node in self.nodes:
            if not node_1st_row or node.setflag:
                node_1st_row = node
                node_2nd_row = None
                node_id = 0
                nodes_posx_one_row = [ node.posx ]
            elif node.posy == node_1st_row.posy:
                nodes_posx_one_row.append(node.posx)
            elif not node_2nd_row:
                node_2nd_row = node
            elif node.posx == 0.0 and node.posy is not None:
                node_1st_row = node
                node_2nd_row = None
                node_id = 0
                nodes_posx_one_row = [ node.posx ]
            elif node.posx is None and node.posy is None:
                node.posx = nodes_posx_one_row[node_id % len(nodes_posx_one_row)]
                node.posy = node_1st_row.posy + ((node_2nd_row.posy - node_1st_row.posy) * (node_id / len(nodes_posx_one_row)))
            node_id += 1

    @staticmethod
    def rack2dict(rack):
        xrack = {}
        xrack['name'] = rack.name
        xrack['posx'] = rack.posx
        xrack['posy'] = rack.posy
        xrack['nodes'] = []

        for node in rack.nodes:
            xrack['nodes'].append(Node.node2dict(node))
        return xrack

    @staticmethod
    def racks2dict(racks):
        xracks = {}
        for name, rack in racks.iteritems():
            xracks[rack.name] = Rack.rack2dict(rack)
        return xracks

class Node(object):

    def __init__(self, name, rack, nodetype, posx, posy, setflag=False):

        self.name = name
        self.rack = rack
        self.nodetype = nodetype
        self.posx = posx
        self.posy = posy
        self.setflag = setflag

    def __repr__(self):
        noderepr = "%s (model: %s, posx: %f, posy %f)" % (self.name, self.nodetype.model, self.posx, self.posy)
        return str(noderepr)

    @staticmethod
    def node2dict(node):
        xnode = {}
        xnode['name'] = node.name
        xnode['type'] = node.nodetype.model
        xnode['posx'] = node.posx
        xnode['posy'] = node.posy
        xnode['height'] = node.nodetype.height
        xnode['width'] = node.nodetype.width
        return xnode

def parse_racks():

    FILE = '/etc/slurm-web/racks.xml'
    try:
        tree = ET.parse(FILE)
    except ET.ParseError as error:
        return None

    root = tree.getroot()

    # parse nodetypes and fill nodetypes dict with
    # NodeType objects
    nodetypes = {}
    nodetypes_e = root.find('nodetypes').findall('nodetype')
    for nodetype_e in nodetypes_e:
        nodetype = NodeType(nodetype_e.get('id'),
                            nodetype_e.find('model').text,
                            float(nodetype_e.find('height').text),
                            float(nodetype_e.find('width').text))
        nodetypes[nodetype.name] = nodetype

    racks = {}
    # parse racks with nodes
    racks_e = root.find('racks').findall('rack')
    for rack_e in racks_e:
        rack = Rack(rack_e.get('id'),
                    int(rack_e.find('posx').text),
                    int(rack_e.find('posy').text))
        racks[rack.name] = rack

        # parse nodes with positions
        nodes_e = rack_e.find('nodes').findall('node')
        for node_e in nodes_e:
            nodetype = nodetypes[node_e.find('type').text]
            setflag = node_e.get('newset') == 'true'
            node = Node(node_e.get('id'), rack, nodetype,
                        float(node_e.find('posx').text),
                        float(node_e.find('posy').text),
                        setflag)
            # add node to rack
            rack.nodes.append(node)

        # parse nodesets w/o positions
        nodesets_e = rack_e.find('nodes').findall('nodeset')
        for nodeset_e in nodesets_e:
            nodeset = NodeSet(nodeset_e.find('range').text)
            nodetype = nodetypes[nodeset_e.find('type').text]
            for xnode in nodeset:
                node = Node(xnode, rack, nodetype, None, None)
                rack.nodes.append(node)
        # set positions for all nodes
        rack.map_nodes()
    return Rack.racks2dict(racks)

def fill_job_user(job):
    uid = job['user_id']
    uid_s = str(uid)
    if not uids.has_key(uid_s):
        pw = pwd.getpwuid(uid)
        uids[uid_s] = {}
        uids[uid_s]['login'] = pw[0]
        uids[uid_s]['username'] = pw[4].split(',')[0] # user name is the first part of gecos
    job['login'] = uids[uid_s]['login']
    job['username'] = uids[uid_s]['username']

if __name__ == '__main__':
    app.run(debug=True)
