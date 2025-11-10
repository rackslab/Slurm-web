#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import random
import logging
from pathlib import Path

from slurmweb.version import get_version

from .lib import (
    Asset,
    BaseAssetsManager,
    TokenizedComponentCrawler,
    DevelopmentHostCluster,
    busy_node,
)

logger = logging.getLogger(__name__)


class AgentAssetsManager(BaseAssetsManager):
    def __init__(self):
        super().__init__(Path("agent"))


class AgentCrawler(TokenizedComponentCrawler):
    def __init__(
        self,
        port: int,
        token: str,
        metrics: bool,
        cluster: DevelopmentHostCluster,
    ):
        self.metrics = metrics
        url = f"http://localhost:{port}"

        # Build asset set with explicit output file names
        asset_set = {
            Asset("info", "info", self._crawl_info),
            Asset("permissions", "permissions", self._crawl_permissions),
            Asset("ping", "ping", self._crawl_ping),
            Asset("stats", "stats", self._crawl_stats),
            Asset("jobs", "jobs", self._crawl_jobs),
            Asset("nodes", "nodes", self._crawl_nodes),
            Asset("jobs-node", "jobs-node", self._crawl_jobs_node),
            Asset("partitions", "partitions", self._crawl_partitions),
            Asset("qos", "qos", self._crawl_qos),
            Asset("reservations", "reservations", self._crawl_reservations),
            Asset("accounts", "accounts", self._crawl_accounts),
            Asset(
                "metrics-nodes-hour",
                "metrics-nodes-hour",
                self._crawl_metrics_nodes_hour,
            ),
            Asset(
                "metrics-cores-hour",
                "metrics-cores-hour",
                self._crawl_metrics_cores_hour,
            ),
            Asset(
                "metrics-jobs-hour", "metrics-jobs-hour", self._crawl_metrics_jobs_hour
            ),
            Asset(
                "metrics-cache-hour",
                "metrics-cache-hour",
                self._crawl_metrics_cache_hour,
            ),
            Asset("cache-stats", "cache-stats", self._crawl_cache_stats),
            Asset("cache-reset", "cache-reset", self._crawl_cache_reset),
        }

        super().__init__(
            "agent",
            asset_set,
            AgentAssetsManager(),
            cluster,
            url,
            token,
        )

    def _crawl_info(self):
        self.dump_component_query("/info", "info")

    def _crawl_permissions(self):
        self.dump_component_query(
            f"/v{get_version()}/permissions",
            "permissions",
        )

    def _crawl_ping(self):
        self.dump_component_query(
            f"/v{get_version()}/ping",
            "ping",
        )

    def _crawl_stats(self):
        self.dump_component_query(
            f"/v{get_version()}/stats",
            "stats",
        )

    def _crawl_jobs(self):
        self.dump_component_query(
            f"/v{get_version()}/jobs",
            "jobs",
            limit_dump=100,
        )

    def _crawl_nodes(self):
        self.dump_component_query(
            f"/v{get_version()}/nodes",
            "nodes",
            skip_exist=False,
        )

    def _crawl_jobs_node(self):
        # Get nodes first to find a busy one
        nodes = self.dump_component_query(
            f"/v{get_version()}/nodes",
            "nodes",
            skip_exist=False,
        )
        # Get jobs which have resources on any of the busy nodes
        try:
            random_busy_node = random.choice(list(filter(busy_node, nodes)))["name"]
            self.dump_component_query(
                f"/v{get_version()}/jobs?node={random_busy_node}",
                "jobs-node",
            )
        except IndexError:
            logger.warning("Unable to find busy node on agent")

    def _crawl_partitions(self):
        self.dump_component_query(
            f"/v{get_version()}/partitions",
            "partitions",
        )

    def _crawl_qos(self):
        self.dump_component_query(
            f"/v{get_version()}/qos",
            "qos",
        )

    def _crawl_reservations(self):
        self.dump_component_query(
            f"/v{get_version()}/reservations",
            "reservations",
        )

    def _crawl_accounts(self):
        self.dump_component_query(
            f"/v{get_version()}/accounts",
            "accounts",
        )

    def _crawl_metrics_nodes_hour(self):
        if self.metrics:
            self.dump_component_query(
                f"/v{get_version()}/metrics/nodes?range=hour",
                "metrics-nodes-hour",
                prettify=False,
            )

    def _crawl_metrics_cores_hour(self):
        if self.metrics:
            self.dump_component_query(
                f"/v{get_version()}/metrics/cores?range=hour",
                "metrics-cores-hour",
                prettify=False,
            )

    def _crawl_metrics_jobs_hour(self):
        if self.metrics:
            self.dump_component_query(
                f"/v{get_version()}/metrics/jobs?range=hour",
                "metrics-jobs-hour",
                prettify=False,
            )

    def _crawl_metrics_cache_hour(self):
        if self.metrics:
            self.dump_component_query(
                f"/v{get_version()}/metrics/cache?range=hour",
                "metrics-cache-hour",
                prettify=False,
            )

    def _crawl_cache_stats(self):
        self.dump_component_query(
            f"/v{get_version()}/cache/stats",
            "cache-stats",
        )

    def _crawl_cache_reset(self):
        # Cache reset (POST) — write minimal JSON body to ensure proper content-type
        self.dump_component_query(
            f"/v{get_version()}/cache/reset",
            "cache-reset",
            method="POST",
            content={},
        )
