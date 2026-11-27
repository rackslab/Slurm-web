#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
import logging
import time
from pathlib import Path
import typing as t

import requests

from .lib import (
    Asset,
    BaseAssetsManager,
    ComponentCrawler,
    DevelopmentHostCluster,
)

from slurmweb.metrics.db import SlurmwebMetricsDB, SlurmwebMetricQuery, SlurmwebMetricId
from slurmweb.metrics.jobs import (
    JOB_METRICS,
    SlurmwebJobMetrics,
    SlurmwebJobMetricsExporterCEEMS,
)

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
        metrics: bool = True,
        job_metrics: bool = False,
    ):
        self.url = url
        self.job = job
        self.db = SlurmwebMetricsDB(url, job)
        # Crawl Slurm-web metrics assets
        self.metrics = metrics
        # Crawl jobs metrics assets
        self.job_metrics = job_metrics

        # Build asset set with explicit output file names
        asset_set = {
            Asset("nodes-hour", "nodes-hour", self._crawl_nodes_hour),
            Asset("cores-hour", "cores-hour", self._crawl_cores_hour),
            Asset("gpus-hour", "gpus-hour", self._crawl_gpus_hour),
            Asset("jobs-hour", "jobs-hour", self._crawl_jobs_hour),
            Asset("cache-hour", "cache-hour", self._crawl_cache_hour),
            Asset("unknown-metric", "unknown-metric", self._crawl_unknown_metric),
            Asset("unknown-path", "unknown-path", self._crawl_unknown_path),
            Asset(
                "job-metrics",
                [f"job-{metric.replace('_', '-')}" for metric in JOB_METRICS],
                self._crawl_job_metrics,
            ),
        }

        super().__init__(
            "prometheus",
            asset_set,
            PrometheusAssetsManager(),
            cluster,
        )

    def get_component_response(
        self,
        query: str,
        headers: dict[str, str] | None = None,
        method: str = "GET",
        content: dict[str, t.Any] | None = None,
        params: dict[str, str] | None = None,
    ) -> requests.Response:
        """Get HTTP response from Prometheus."""
        if headers is None:
            headers = {}
        if method != "GET":
            raise RuntimeError(f"Unsupported request method {method} for Prometheus")
        return requests.get(f"{self.url}{query}", headers=headers, params=params)

    def _crawl_nodes_hour(self):
        if not self.metrics:
            return
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["nodes"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            self.dump_component_query(
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                "nodes-hour",
                prettify=False,
            )

    def _crawl_cores_hour(self):
        if not self.metrics:
            return
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["cores"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            self.dump_component_query(
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                "cores-hour",
                prettify=False,
            )

    def _crawl_gpus_hour(self):
        if not self.metrics:
            return
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["gpus"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            self.dump_component_query(
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                "gpus-hour",
                prettify=False,
            )

    def _crawl_jobs_hour(self):
        if not self.metrics:
            return
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["jobs"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            self.dump_component_query(
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                "jobs-hour",
                prettify=False,
            )

    def _crawl_cache_hour(self):
        if not self.metrics:
            return
        params = SlurmwebMetricsDB.METRICS_QUERY_PARAMS["cache"]
        for _id in params.ids:
            _, _, _query = self.db._query(_id, params, "hour")
            self.dump_component_query(
                f"{self.db.REQUEST_BASE_PATH}{_query}",
                "cache-hour",
                prettify=False,
            )

    def _crawl_unknown_metric(self):
        if not self.metrics:
            return
        # query unexisting metric
        params = SlurmwebMetricQuery(
            "query",
            [SlurmwebMetricId("fail")],
            SlurmwebMetricsDB.RANGE_RESOLUTIONS["30s"],
        )
        _, _, _query = self.db._query(params.ids[0], params, "hour")
        self.dump_component_query(
            f"{self.db.REQUEST_BASE_PATH}{_query}",
            "unknown-metric",
        )

    def _crawl_unknown_path(self):
        if not self.metrics:
            return
        # query unknown API path
        self.dump_component_query(
            f"{self.db.REQUEST_BASE_PATH}/fail",
            "unknown-path",
        )

    def _crawl_job_metrics(self):
        if not self.job_metrics:
            return
        if not self.cluster.has_job_metrics() or not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no jobs metrics or no GPU, skipping job-metrics",
                self.cluster.name,
            )
            return
        job_id, user, start = self.cluster.setup_for_job_metrics(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        end = int(time.time())
        # Send the same queries as the agent for this job.
        step, window = SlurmwebJobMetrics.resolution(start, end)
        start = start - start % step
        exporter = SlurmwebJobMetricsExporterCEEMS(
            self.cluster.settings.metrics.ceems_job
        )
        for metric in JOB_METRICS:
            query = SlurmwebMetricsDB.query_range_path(
                exporter.promql(metric, job_id, window), start, end, step
            )
            self.dump_component_query(
                f"{self.db.REQUEST_BASE_PATH}{query}",
                f"job-{metric.replace('_', '-')}",
                prettify=False,
            )
