# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import collections
from datetime import datetime, timedelta

import requests

from ..errors import SlurmwebMetricsDBError

SlurmWebRangeResolution = collections.namedtuple(
    "SlurmWebRangeResolution", ["resolution", "range"]
)


class SlurmwebMetricsDB:
    RANGE_RESOLUTIONS = {
        "hour": SlurmWebRangeResolution("1m", "1h"),
        "day": SlurmWebRangeResolution("10m", "1d"),
        "week": SlurmWebRangeResolution("1h", "1w"),
    }
    METRICS_SETTINGS = {
        "nodes": {
            "endpoint": "query",
            "name": "slurm_nodes",
            "agg": "avg_over_time",
        },
        "cores": {
            "endpoint": "query",
            "name": "slurm_cores",
            "agg": "avg_over_time",
        },
        "gpus": {
            "endpoint": "query",
            "name": "slurm_gpus",
            "agg": "avg_over_time",
        },
        "jobs": {
            "endpoint": "query",
            "name": "slurm_jobs",
            "agg": "avg_over_time",
        },
        "cache": {
            "endpoint": "query_range",
            "name": "slurmweb_cache_hit_total",
            "agg": "rate",
        },
    }

    REQUEST_BASE_PATH = "/api/v1/"

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
        print(json)
        # Check result is not empty
        if not json["data"]["result"]:
            raise SlurmwebMetricsDBError(f"Empty result for query {query}")
        try:
            return {
                result["metric"].get("state", "value"): [
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
        range = ""
        if self.METRICS_SETTINGS[metric]["agg"] == "avg_over_time":
            range = (
                f"[{self.RANGE_RESOLUTIONS[last].range}:"
                f"{self.RANGE_RESOLUTIONS[last].resolution}]"
            )
        else:
            end = datetime.now()
            if last == "hour":
                start = end - timedelta(hours=1)
            elif last == "day":
                start = end - timedelta(days=1)
            elif last == "week":
                start = end - timedelta(days=7)
            range = (
                f"&start={start.timestamp()}&end={end.timestamp()}&"
                f"step={self.RANGE_RESOLUTIONS[last].resolution}"
            )
        return (
            f"{self.METRICS_SETTINGS[metric]['endpoint']}?query="
            f"{self.METRICS_SETTINGS[metric]['agg']}({self.METRICS_SETTINGS[metric]['name']}{{job='{self.job}'}}"
            f"[{self.RANGE_RESOLUTIONS[last].resolution}]){range}"
        )
