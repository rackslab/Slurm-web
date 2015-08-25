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

import os
import json

mocks = os.path.join(os.path.dirname(__file__), 'mocks/')
mocking = os.environ.get('REST_ENV') == 'development'


def mock(filename):
    with open(mocks + filename, 'r') as data_file:
        return json.load(data_file)


def mock_job(job_id):
    datas = mock('jobs.json')
    try:
        return datas[job_id]
    except KeyError:
        return {}
