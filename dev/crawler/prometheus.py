#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging
from pathlib import Path

from .lib import (
    Asset,
    BaseAssetsManager,
    ComponentCrawler,
    DevelopmentHostCluster,
    dump_component_query,
)

from slurmweb.metrics.db import SlurmwebMetricsDB, SlurmwebMetricQuery, SlurmwebMetricId

logger = logging.getLogger(__name__)


class PrometheusAssetsManager(BaseAssetsManager):
    def __init__(self):
        super().__init__(Path("prometheus"))


class PrometheusCrawler(ComponentCrawler):
    def __init__(
        self,
        url: str,
        job: str,
        cluster: DevelopmentHostCluster,
    ):
        self.url = url
        self.job = job
        self.db = SlurmwebMetricsDB(url, job)

        # Build asset set with explicit output file names
        asset_set = {
            Asset("nodes-hour", "nodes-hour", self._crawl_nodes_hour),
            Asset("cores-hour", "cores-hour", self._crawl_cores_hour),
            Asset("gpus-hour", "gpus-hour", self._crawl_gpus_hour),
            Asset("jobs-hour", "jobs-hour", self._crawl_jobs_hour),
            Asset("cache-hour", "cache-hour", self._crawl_cache_hour),
            Asset("unknown-metric", "unknown-metric", self._crawl_unknown_metric),
            Asset("unknown-path", "unknown-path", self._crawl_unknown_path),
        }

        super().__init__(
            "prometheus",
            asset_set,
            PrometheusAssetsManager(),
            cluster,
        )

    def _crawl_nodes_hour(self):
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["nodes"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            dump_component_query(
                self.manager.statuses,
                self.url,
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                {},
                self.manager.path,
                "nodes-hour",
                prettify=False,
            )

    def _crawl_cores_hour(self):
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["cores"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            dump_component_query(
                self.manager.statuses,
                self.url,
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                {},
                self.manager.path,
                "cores-hour",
                prettify=False,
            )

    def _crawl_gpus_hour(self):
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["gpus"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            dump_component_query(
                self.manager.statuses,
                self.url,
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                {},
                self.manager.path,
                "gpus-hour",
                prettify=False,
            )

    def _crawl_jobs_hour(self):
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["jobs"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            dump_component_query(
                self.manager.statuses,
                self.url,
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                {},
                self.manager.path,
                "jobs-hour",
                prettify=False,
            )

    def _crawl_cache_hour(self):
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["cache"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            dump_component_query(
                self.manager.statuses,
                self.url,
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                {},
                self.manager.path,
                "cache-hour",
                prettify=False,
            )

    def _crawl_unknown_metric(self):
        # query unexisting metric
        params = SlurmwebMetricQuery(
            "query",
            [SlurmwebMetricId("fail")],
            SlurmwebMetricsDB.RANGE_RESOLUTIONS["30s"],
        )
        _, _, _query = self.db._query(params.ids[0], params, "hour")
        dump_component_query(
            self.manager.statuses,
            self.url,
            f"{self.db.REQUEST_BASE_PATH}{_query}",
            {},
            self.manager.path,
            "unknown-metric",
        )

    def _crawl_unknown_path(self):
        # query unknown API path
        dump_component_query(
            self.manager.statuses,
            self.url,
            f"{self.db.REQUEST_BASE_PATH}/fail",
            {},
            self.manager.path,
            "unknown-path",
        )
