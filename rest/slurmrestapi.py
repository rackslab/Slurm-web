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

from flask import Flask, jsonify, request, abort
import pyslurm
import pwd

# for racks description
from racks import parse_racks

# for mocking json
from mocks import mock, mock_job, mocking

# for CORS
from cors import crossdomain
from settings import settings

# for authentication
from auth import (User, authentication_verify, AuthenticationError,
                  all_restricted)

app = Flask(__name__)

app.secret_key = settings.get('config', 'secret_key')

uids = {}  # cache of user login/names to avoid duplicate NSS resolutions

origins = settings.get('cors', 'authorized_origins')


@app.route('/version', methods=['GET', 'OPTIONS'])
@crossdomain(origin=origins)
def version():
    return "Slurm-web REST API v%s" % settings.get('infos', 'version')


@app.route('/login', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins)
def login():
    if request.form.get('guest', None) == 'true':
        user = User.guest()
    else:
        try:
            user = User.user(request.form['username'], request.form['password'])
        except AuthenticationError:
            abort(403)

    token = user.generate_auth_token()
    resp = {
        'id_token': token,
        'username': user.username,
        'role':     user.role
    }
    return jsonify(resp)


@app.route('/guest', methods=['GET'])
@crossdomain(origin=origins)
def guest():
    return jsonify({'guest': not all_restricted})


@app.route('/jobs', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
def get_jobs():
    if mocking:
        return mock('jobs.json')

    jobs = pyslurm.job().get()

    # add login and username (additionally to UID) for each job
    for jobid, job in jobs.iteritems():
        fill_job_user(job)

    return jobs


@app.route('/job/<int:job_id>', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
def show_job(job_id):
    if mocking:
        return mock_job(job_id)

    # cache_key = "show_job_" + job_id
    # if redis.exists(cache_key)
    #     return redis.get(cache_key)

    job = pyslurm.job().find_id(job_id)
    fill_job_user(job)

    # redis.set(cache_key, job, 10)

    return job


@app.route('/nodes', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
def get_nodes():
    if mocking:
        return mock('nodes.json')

    nodes = pyslurm.node().get()
    return nodes


@app.route('/cluster', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
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
def get_racks():
    if mocking:
        return mock('racks.json')

    racks = parse_racks()
    return racks


@app.route('/reservations', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
def get_reservations():
    if mocking:
        return mock('reservations.json')

    reservations = pyslurm.reservation().get()
    return reservations


@app.route('/partitions', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
def get_partitions():
    if mocking:
        return mock('partitions.json')

    partitions = pyslurm.partition().get()
    return partitions


@app.route('/qos', methods=['POST', 'OPTIONS'])
@crossdomain(origin=origins, methods=['POST'],
             headers=['Accept', 'Content-Type'])
@authentication_verify()
def get_qos():
    if mocking:
        return mock('qos.json')

    qos = pyslurm.qos().get()
    return qos


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
