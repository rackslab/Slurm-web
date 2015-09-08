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
import time

mocks = os.path.join(os.path.dirname(__file__), 'mocks/')
mocking = os.environ.get('REST_ENV') == 'development'

referal_timestamp = 1435564250
time_keys_to_shift = [
    "eligible_time",
    "end_time",
    "start_time",
    "submit_time"
]


def time_shift_dict(datas, time_interval):
    if isinstance(datas, dict):
        for key in set(datas):
            if key in time_keys_to_shift:
                datas[key] += time_interval
            else:
                if isinstance(datas[key], dict):
                    time_shift_dict(datas[key], time_interval)
    return datas


def mock(filename):
    time_interval = int(time.time()) - referal_timestamp
    with open(mocks + filename, 'r') as data_file:
        return time_shift_dict(json.load(data_file), time_interval)


def mock_job(job_id):
    datas = mock('jobs.json')
    try:
        return datas[str(job_id)]
    except KeyError:
        return {}
