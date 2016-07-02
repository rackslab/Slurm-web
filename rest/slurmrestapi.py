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

from flask import (Flask, jsonify, request, abort, send_from_directory,
                   render_template)
import pyslurm
import pwd
import json

# for racks description
from racks import parse_racks

# for mocking json
from mocks import mock, mock_job, mocking

# for CORS
from cors import crossdomain
from settings import settings

# for authentication
from auth import (User, authentication_verify, AuthenticationError,
                  all_restricted, auth_enabled, AllUnauthorizedError)

from cache import cache

# for nodeset conversion
from ClusterShell.NodeSet import NodeSet
import unicodedata

app = Flask(__name__)

try:
    app.secret_key = settings.get('config', 'secret_key') or 'secret_key'
except Exception:
    app.secret_key = 'secret_key'

uids = {}  # cache of user login/names to avoid duplicate NSS resolutions

origins = settings.get('cors', 'authorized_origins')


@app.errorhandler(403)
def custom403(error):
    response = jsonify({'message': error.description})
    response.status_code = 403
    response.headers['Access-Control-Allow-Origin'] = request.headers['Origin']
    return response


@app.route('/version', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def version():
    return "Slurm-web REST API v2.0"


@app.route('/static/<path:path>')
def send_js(path):
    return send_from_directory('static', path)


@app.route('/proxy')
def proxy():
    masters = ", ".join(map(lambda s: "\"%s\": \"*\"" % s, origins.split(',')))
    return render_template('proxy.html',
                           url_root=request.url_root,
                           masters=masters)


@app.route('/login', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
def login():
    if not auth_enabled:
        abort(404)

    data = json.loads(request.data)
    if data.get('guest', None) == True:
        user = User.guest()
    else:
        try:
            user = User.user(data['username'],
                             data['password'])
        except AuthenticationError:
            abort(403, "Error: your login / password doesn't match.")
        except AllUnauthorizedError:
            abort(403, "Error: you have not any role for this cluster")

    token = user.generate_auth_token()
    resp = {
        'id_token':         token,
        'username':         user.username,
        'role':             user.role,
        'restricted_views': user.restricted_views()
    }
    return jsonify(resp)


@app.route('/authentication', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins, methods=['GET'],
             headers=['Accept', 'Content-Type'])
def authentication():
    return jsonify({
        'enabled': auth_enabled,
        'guest': not all_restricted
        })


@app.route('/jobs', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_jobs():
    if mocking:
        jobs = mock('jobs.json')
    else:
        jobs = pyslurm.job().get()

    for jobid, job in jobs.iteritems():
        # add login and username (additionally to UID) for each job
        try:
            fill_job_user(job)
        except (KeyError):
            pass

        # convert nodeset in array of nodes
        if job["nodes"] is not None:
            jobs[jobid]["nodeset"] = list(
                NodeSet(job["nodes"].encode('ascii', 'ignore'))
            )

    return jobs


@app.route('/job/<int:job_id>', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def show_job(job_id):
    if mocking:
        return mock_job(job_id)

    job = pyslurm.job().find_id(job_id)
    fill_job_user(job)

    return job


@app.route('/nodes', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_nodes():
    if mocking:
        return mock('nodes.json')

    nodes = pyslurm.node().get()
    return nodes


@app.route('/cluster', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
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
    return cluster


@app.route('/racks', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_racks():
    try:
        racks = parse_racks()
    except Exception as e:
        racks = {'error': str(e)}
    return racks


@app.route('/reservations', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_reservations():
    if mocking:
        return mock('reservations.json')

    reservations = pyslurm.reservation().get()
    return reservations


@app.route('/partitions', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_partitions():
    if mocking:
        return mock('partitions.json')

    partitions = pyslurm.partition().get()
    return partitions


@app.route('/qos', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_qos():
    if mocking:
        return mock('qos.json')

    try:
        qos = pyslurm.qos().get()
    except Exception as e:
        qos = {'error': str(e)}
    return qos


@app.route('/topology', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_topology():
    if mocking:
        return mock('topology.json')

    try:
        topology = pyslurm.topology().get()
    except Exception as e:
        topology = {'error': str(e)}
    return topology


# returns a dict composed with all jobs running on the given node
# with their ID as key
@app.route('/jobs-by-node/<node_id>', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_jobs_by_node_id(node_id):
    if mocking:
        jobs = mock('jobs.json')
    else:
        jobs = pyslurm.job().get()

    returned_jobs = {}

    # filter jobs by node
    for jobid, job in jobs.iteritems():
        nodes_list = job['cpus_allocated'].keys()
        print "Nodelist for %s : %s" % (node_id, nodes_list)
        if node_id in nodes_list:
            returned_jobs[jobid] = job
            print "Node %s added to jobs : %s" % (node_id, returned_jobs)

    if not mocking:
        for jobid, job in returned_jobs.iteritems():
            fill_job_user(job)

    return returned_jobs


# returns a dict composed with all jobs running on the given nodes
# with their ID as key
@app.route('/jobs-by-node-ids', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_jobs_by_node_ids():
    if mocking:
        jobs = mock('jobs.json')
    else:
        jobs = pyslurm.job().get()

    print "Post datas : %s" % request.data
    nodes = json.loads(request.data).get('nodes', [])
    print "Nodelist : %s" % nodes

    returned_jobs = {}

    # filter jobs by node
    for jobid, job in jobs.iteritems():
        nodes_list = job['cpus_allocated'].keys()
        print "Nodelist for %s : %s" % (jobid, nodes_list)

        for node_id in nodes:
            if node_id in nodes_list:
                returned_jobs[jobid] = job
                print "Node %s added to jobs : %s" % (node_id, returned_jobs)

    if not mocking:
        for jobid, job in returned_jobs.iteritems():
            fill_job_user(job)

    return returned_jobs


# returns a dict composed with all nodes ID as key associated to a dict
# composed by all jobs running on the concerned node
@app.route('/jobs-by-nodes', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_jobs_by_nodes():
    if mocking:
        jobs = mock('jobs.json')
        nodes = mock('nodes.json')
    else:
        jobs = pyslurm.job().get()
        nodes = pyslurm.node().get()

    returned_nodes = {}

    for node_id, node in nodes.iteritems():
        returned_jobs = {}
        # filter jobs by node
        for jobid, job in jobs.iteritems():
            nodes_list = job['cpus_allocated'].keys()
            if node_id in nodes_list:
                returned_jobs[jobid] = job

        returned_nodes[node_id] = returned_jobs

    return returned_nodes


# returns a dict composed with all qos ID as key associated to a dict
# composed by all jobs on the concerned node
@app.route('/jobs-by-qos', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
@cache()
def get_jobs_by_qos():
    if mocking:
        jobs = mock('jobs.json')
        qos = mock('qos.json')
    else:
        jobs = pyslurm.job().get()
        qos = pyslurm.qos().get()

    returned_qos = {}

    for qos_id, q in qos.iteritems():
        returned_jobs = {}
        # filter jobs by node
        for jobid, job in jobs.iteritems():
            if qos_id == job['qos']:
                returned_jobs[jobid] = job

        returned_qos[qos_id] = returned_jobs

    return returned_qos


@app.route('/nodeset', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@cache()
def convert_nodeset():
    data = json.loads(request.data)
    return json.dumps(list(NodeSet(data['nodeset'].encode('ascii', 'ignore'))))


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
