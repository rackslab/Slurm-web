# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import collections
from datetime import datetime, timedelta
import asyncio
import logging

import aiohttp

from rfl.core.asyncio import asyncio_run

from ..errors import SlurmwebMetricsDBError

SlurmWebRangeResolutionSet = collections.namedtuple(
    "SlurmWebRangeResolutionSet", ["hour", "day", "week"]
)

SlurmWebRangeResolution = collections.namedtuple(
    "SlurmWebRangeResolution", ["step", "range", "rounding"]
)


logger = logging.getLogger(__name__)


class SlurmwebMetricId:
    def __init__(self, name, key=None):
        self.name = name
        if key:
            self.key = key
        else:
            self.key = name


class SlurmwebMetricQuery:
    def __init__(
        self,
        endpoint,
        ids: t.List[SlurmwebMetricId],
        resolution: SlurmWebRangeResolutionSet,
        agg=None,
        label_as_key=None,
        key=None,
    ):
        self.endpoint = endpoint
        self.ids = ids
        self.resolution = resolution
        self.agg = agg
        self.label_as_key = label_as_key
        self.key = key


class SlurmwebMetricsDB:
    RANGE_RESOLUTIONS = {
        "30s": SlurmWebRangeResolutionSet(
            hour=SlurmWebRangeResolution("30s", "1h", 30),
            day=SlurmWebRangeResolution("10m", "1d", 600),
            week=SlurmWebRangeResolution("1h", "1w", 3600),
        ),
        "1m": SlurmWebRangeResolutionSet(
            hour=SlurmWebRangeResolution("1m", "1h", 60),
            day=SlurmWebRangeResolution("10m", "1d", 600),
            week=SlurmWebRangeResolution("1h", "1w", 3600),
        ),
    }
    METRICS_QUERY_PARAMS = {
        "nodes": SlurmwebMetricQuery(
            "query",
            [SlurmwebMetricId("slurm_nodes")],
            RANGE_RESOLUTIONS["30s"],
            agg="avg_over_time",
            label_as_key="state",
        ),
        "cores": SlurmwebMetricQuery(
            "query",
            [SlurmwebMetricId("slurm_cores")],
            RANGE_RESOLUTIONS["30s"],
            agg="avg_over_time",
            label_as_key="state",
        ),
        "gpus": SlurmwebMetricQuery(
            "query",
            [SlurmwebMetricId("slurm_gpus")],
            RANGE_RESOLUTIONS["30s"],
            agg="avg_over_time",
            label_as_key="state",
        ),
        "jobs": SlurmwebMetricQuery(
            "query",
            [SlurmwebMetricId("slurm_jobs")],
            RANGE_RESOLUTIONS["30s"],
            agg="avg_over_time",
            label_as_key="state",
        ),
        "cache": SlurmwebMetricQuery(
            "query_range",
            [
                SlurmwebMetricId("slurmweb_cache_hit_total", "hit"),
                SlurmwebMetricId("slurmweb_cache_miss_total", "miss"),
            ],
            RANGE_RESOLUTIONS["1m"],
        ),
    }

    REQUEST_BASE_PATH = "/api/v1/"

    def __init__(self, base_uri, job):
        self.base_uri = base_uri
        self.job = job

    def request(self, metric, last):
        params = self.METRICS_QUERY_PARAMS[metric]
        return self._merge_results(asyncio_run(self._requests(params, last)))

    def _merge_results(self, results):
        merge = {}
        for result in results:
            merge.update(result)
        return merge

    async def _requests(self, params, last):
        """Return the list of available clusters with permissions. Clusters on which
        request to get permissions failed are filtered out."""
        return await asyncio.gather(
            *[self._request(*self._query(id, params, last)) for id in params.ids]
        )

    async def _request(self, id, params, query):
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_uri.geturl()}{self.REQUEST_BASE_PATH}{query}"
                logger.debug("Send metrics request %s", url)
                async with session.get(url) as response:
                    if response.status != 200:
                        raise SlurmwebMetricsDBError(
                            f"Unexpected response status {response.status} for metrics "
                            f"database request {url}"
                        )
                    try:
                        json = await response.json()
                    except aiohttp.client_exceptions.ContentTypeError as err:
                        raise SlurmwebMetricsDBError(
                            "Unsupported Content-Type for metrics database request "
                            f"{url}"
                        ) from err
        except aiohttp.ClientConnectionError as err:
            raise SlurmwebMetricsDBError(
                f"Metrics database connection error: {str(err)}"
            ) from err

        # Check result is not empty
        if not json["data"]["result"]:
            raise SlurmwebMetricsDBError(f"Empty result for query {query}")
        try:
            result = {}
            for _result in json["data"]["result"]:
                if params.label_as_key:
                    _key = _result["metric"][params.label_as_key]
                else:
                    _key = id.key
                result[_key] = [
                    # Convert timestamp for second to millisecond and values from
                    # string to floats.
                    [t_v_pair[0] * 1000, float(t_v_pair[1])]
                    for t_v_pair in _result["values"]
                ]
            return result
        except RuntimeError as err:
            raise SlurmwebMetricsDBError(
                f"Unexpected result on metrics query {query}"
            ) from err

    def _query(self, id, params, last):
        try:
            resolution = getattr(params.resolution, last)
        except AttributeError as err:
            raise SlurmwebMetricsDBError(f"Unsupported metric range {last}") from err
        range = None

        def _rounded_timetstamp(timestamp):
            return timestamp - timestamp % resolution.rounding

        filter = f"{{job='{self.job}'}}"
        if params.agg:
            range = f"[{resolution.range}:{resolution.step}]"
            _promql = f"{params.agg}({id.name}{filter}[{resolution.step}]){range}"
        else:
            end = datetime.now()
            start = end
            if last == "hour":
                start = end - timedelta(hours=1)
            elif last == "day":
                start = end - timedelta(days=1)
            elif last == "week":
                start = end - timedelta(days=7)
            range = (
                f"&start={_rounded_timetstamp(start.timestamp())}&"
                f"end={_rounded_timetstamp(end.timestamp())}&step={resolution.step}"
            )
            _promql = (
                f"{id.name}{filter}-{id.name}{filter} offset {resolution.step} {range}"
            )
        return id, params, (f"{params.endpoint}?query={_promql}")
