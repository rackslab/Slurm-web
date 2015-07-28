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

# for mocking json
from mocks import mock, mocking

# for CORS
from cors import crossdomain
from settings import settings

app = Flask(__name__)

uids = {}  # cache of user login/names to avoid duplicate NSS resolutions

origins = settings.get('cors', 'authorized_origins')


@app.route('/version', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def version():
    return "Slurm-web REST API v%s" % settings.get('infos', 'version')


@app.route('/jobs', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_jobs():
    if mocking:
        return mock('jobs.json')

    jobs = pyslurm.job().get()

    # add login and username (additionally to UID) for each job
    for jobid, job in jobs.iteritems():
        fill_job_user(job)

    return jsonify(jobs)


@app.route('/job/<int:job_id>')
@crossdomain(origin=origins)
def show_job(job_id):
    if mocking:
        return mock('job.json')

    job = pyslurm.job().find_id(job_id)
    fill_job_user(job)
    return jsonify(job)


@app.route('/nodes', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_nodes():
    if mocking:
        return mock('nodes.json')

    nodes = pyslurm.node().get()
    return jsonify(nodes)


@app.route('/cluster', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_cluster():
    if mocking:
        return mock('cluster.json')

    nodes = pyslurm.node().get()
    cluster = {}
    cluster['name'] = pyslurm.config().get()['cluster_name']
    cluster['nodes'] = len(nodes.keys())
    cluster['cores'] = 0
    for nodename, node in nodes.iteritems():
        cluster['cores'] += node['cpus']
    return jsonify(cluster)


@app.route('/racks', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_racks():
    if mocking:
        return mock('racks.json')

    racks = parse_racks()
    return jsonify(racks)


@app.route('/reservations', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_reservations():
    if mocking:
        return mock('reservations.json')

    reservations = pyslurm.reservation().get()
    return jsonify(reservations)


@app.route('/partitions', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_partitions():
    if mocking:
        return mock('partitions.json')

    partitions = pyslurm.partition().get()
    return jsonify(partitions)


@app.route('/qos', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def get_qos():
    if mocking:
        return mock('qos.json')

    qos = pyslurm.qos().get()
    return jsonify(qos)


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
        self.nodes = []  # list of nodes in the rack

    def __repr__(self):

        rackrepr = "rack %s (posx: %d, posy: %d):\n" % (self.name, self.posx,
                                                        self.posy)
        for node in self.nodes:
            rackrepr += " - %s\n" % (str(node))
        return rackrepr

    def _sort_nodes(self):
        self.nodes.sort(key=lambda node: node.name)

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

    def __init__(self, name, rack, nodetype, posx, posy):

        self.name = name
        self.rack = rack
        self.nodetype = nodetype
        self.posx = posx
        self.posy = posy

    def __repr__(self):
        noderepr = "%s (model: %s, posx: %f, posy %f)" % (self.name,
                                                          self.nodetype.model,
                                                          self.posx, self.posy)
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
        print error
        return None

    root = tree.getroot()

    # parse nodetypes and fill nodetypes dict with
    # NodeType objects
    nodetypes = {}
    nodetypes_e = root.find('nodetypes').findall('nodetype')
    for nodetype_e in nodetypes_e:
        nodetype = NodeType(nodetype_e.get('id'),
                            nodetype_e.get('model'),
                            float(nodetype_e.get('height')),
                            float(nodetype_e.get('width')))
        nodetypes[nodetype.name] = nodetype

    racks = {}
    # parse racks with nodes
    racks_e = root.find('racks').findall('rack')
    for rack_e in racks_e:
        posx = int(rack_e.get('posx')) if rack_e.get('posx') else 0
        posy = int(rack_e.get('posy')) if rack_e.get('posy') else 0
        rack = Rack(rack_e.get('id'), posx, posy)
        racks[rack.name] = rack

        # parse nodes
        nodes_e = rack_e.find('nodes').findall('node')
        for node_e in nodes_e:
            nodetype = nodetypes[node_e.get('type')]
            posx = float(node_e.get('posx')) if node_e.get('posx') else 0
            posy = float(node_e.get('posy')) if node_e.get('posy') else 0
            node = Node(node_e.get('id'), rack, nodetype, posx, posy)
            # add node to rack
            rack.nodes.append(node)

        # parse nodesets
        nodesets_e = rack_e.find('nodes').findall('nodeset')
        for nodeset_e in nodesets_e:
            nodeset = NodeSet(nodeset_e.get('id'))
            draw_dir = 1 if (not nodeset_e.get('draw') or
                             nodeset_e.get('draw') == "up") else -1
            nodetype = nodetypes[nodeset_e.get('type')]
            cur_x = float(
                nodeset_e.get('posx')
                ) if nodeset_e.get('posx') else 0
            cur_y = float(
                nodeset_e.get('posy')
                ) if nodeset_e.get('posy') else 0
            for xnode in nodeset:
                node = Node(xnode, rack, nodetype, cur_x, cur_y)
                rack.nodes.append(node)
                cur_x += nodetype.width
                if cur_x == 1:
                    cur_x = float(0)
                    cur_y += nodetype.height * draw_dir

    return Rack.racks2dict(racks)


def fill_job_user(job):
    uid = job['user_id']
    uid_s = str(uid)
    if uid_s not in uids:
        pw = pwd.getpwuid(uid)
        uids[uid_s] = {}
        uids[uid_s]['login'] = pw[0]
        # user name is the first part of gecos
        uids[uid_s]['username'] = pw[4].split(',')[0]
    job['login'] = uids[uid_s]['login']
    job['username'] = uids[uid_s]['username']

if __name__ == '__main__':
    app.run(debug=True)
