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

from flask import Flask, send_from_directory

app = Flask(__name__)
app.secret_key = "secret_key"


@app.route('/version', methods=['GET'])
def version():
    return "Slurm-web Dashboard Conf"


@app.route('/<path:path>', methods=['GET'])
def send_file(path):
    return send_from_directory('/etc/slurm-web/dashboard', path)


if __name__ == '__main__':
    app.run(debug=True)
