# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import collections

import requests

from ..errors import SlurmwebMetricsDBError

SlurmWebRangeResolution = collections.namedtuple(
    "SlurmWebRangeResolution", ["resolution", "range"]
)


class SlurmwebMetricsDB:
    RANGE_RESOLUTIONS = {
        "hour": SlurmWebRangeResolution("30s", "1h"),
        "day": SlurmWebRangeResolution("10m", "1d"),
        "week": SlurmWebRangeResolution("1h", "1w"),
    }
    REQUEST_BASE_PATH = "/api/v1/query?query="

    def __init__(self, base_uri, job):
        self.base_uri = base_uri
        self.job = job

    def request(self, metric, last):
        return self._request(self._query(metric, last))

    def _request(self, query):
        url = f"{self.base_uri.geturl()}{self.REQUEST_BASE_PATH}{query}"
        try:
            response = requests.get(url)
        except requests.exceptions.ConnectionError as err:
            raise SlurmwebMetricsDBError(
                f"Connection error on {self.base_uri.geturl()}: {err}"
            ) from err
        json = response.json()
        # Check response status code
        if response.status_code != 200:
            raise SlurmwebMetricsDBError(
                f"Prometheus error for query {query}: {json['error']}"
            )
        # Check result is not empty
        if not json["data"]["result"]:
            raise SlurmwebMetricsDBError(f"Empty result for query {query}")
        try:
            return {
                result["metric"]["state"]: [
                    # Convert timestamp for second to millisecond and values from
                    # string to floats.
                    [t_v_pair[0] * 1000, float(t_v_pair[1])]
                    for t_v_pair in result["values"]
                ]
                for result in json["data"]["result"]
            }
        except KeyError as err:
            raise SlurmwebMetricsDBError(
                f"Unexpected result on metrics query {query}"
            ) from err

    def _query(self, metric, last):
        if last not in self.RANGE_RESOLUTIONS.keys():
            raise SlurmwebMetricsDBError(f"Unsupported metric range {last}")
        return (
            f'avg_over_time(slurm_{metric}{{job="{self.job}"}}'
            f"[{self.RANGE_RESOLUTIONS[last].resolution}])"
            f"[{self.RANGE_RESOLUTIONS[last].range}:"
            f"{self.RANGE_RESOLUTIONS[last].resolution}]"
        )
