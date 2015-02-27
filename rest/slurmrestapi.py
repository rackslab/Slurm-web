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

app = Flask(__name__)

@app.route('/jobs', methods=['GET'])
def get_jobs():
    jobs = pyslurm.job().get()
    return jsonify(jobs)

@app.route('/nodes', methods=['GET'])
def get_nodes():
    nodes = pyslurm.node().get()
    return jsonify(nodes)

if __name__ == '__main__':
    app.run(debug=True)
