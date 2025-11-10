#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
import typing as t
import sys
import os
import json
import random
import getpass
from pathlib import Path
import logging

import requests

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostClient

from .lib import (
    Asset,
    BaseAssetsManager,
    TokenizedComponentCrawler,
    load_settings,
    busy_node,
    DevelopmentHostCluster,
)

ADMIN_PASSWORD_ENV_VAR = "SLURMWEB_DEV_ADMIN_PASSWORD"

logger = logging.getLogger(__name__)


class GatewayAssetsManager(BaseAssetsManager):
    def __init__(self):
        super().__init__("gateway")


def gateway_url(dev_tmp_dir):
    """Return the gateway URL with service TCP port found in configuration."""
    # Load gateway configuration
    settings = load_settings("conf/vendor/gateway.yml", dev_tmp_dir, "gateway.ini")
    # Compose and return the URL to the gateway
    return f"http://localhost:{settings.service.port}"


def user_token(url: str, user: str):
    """Ask user password interactively, authenticate on gateway and return
    authentication JWT."""

    try:
        password = os.environ[ADMIN_PASSWORD_ENV_VAR]
    except KeyError:
        logger.info(
            "Unable to read admin password from environment, opening interactive "
            "prompt."
        )
        password = getpass.getpass(prompt=f"Password for {user} on gateway: ")

    response = requests.post(
        f"{url}/api/login", json={"user": user, "password": password}
    )
    if response.status_code != 200:
        logger.error(
            "Authentication failed on gateway: %s", response.json()["description"]
        )
        sys.exit(1)

    return response.json()["token"]


def admin_user(dev_host: DevelopmentHostClient, cluster: str):
    """Return name of a user in admin group for the given cluster."""

    _, stdout, _ = dev_host.exec(["firehpc", "status", "--cluster", cluster, "--json"])
    cluster_status = json.loads(stdout.read())
    stdout.close()

    for group in cluster_status["groups"]:
        if group["name"] == "admin":
            return group["members"][0]

    logger.error("Unable to find user in admin group on cluster %s", cluster)
    sys.exit(1)


def slurmweb_token(
    dev_host: DevelopmentHostClient,
    cluster: str,
    infrastructure: str,
    dev_tmp_dir: Path,
):
    # Retrieve admin user account to connect
    user = admin_user(dev_host, infrastructure)
    logger.info("Found user %s in group admin on cluster %s", user, cluster)

    # Get gateway HTTP base URL from configuration
    url = gateway_url(dev_tmp_dir)

    # Authenticate on gateway and get token
    return user_token(url, user)


class GatewayCrawler(TokenizedComponentCrawler):
    def __init__(
        self,
        token: str,
        cluster: DevelopmentHostCluster,
        infrastructure: str,
        dev_tmp_dir: Path,
    ):
        # Build asset set with explicit output file names for special cases
        asset_set = {
            Asset("clusters", "clusters", self._crawl_clusters),
            Asset("users", "users", self._crawl_users),
            Asset(
                "login",
                {
                    200: "login-success",
                    401: "login-failure",
                },
                self._crawl_login,
            ),
            Asset("ping", "ping", self._crawl_ping),
            Asset("stats", "stats", self._crawl_stats),
            Asset(
                "jobs",
                [
                    "jobs",
                    "job-pending",
                    "job-running",
                    "job-archived",
                ],
                self._crawl_jobs,
            ),
            Asset("job-gpus-running", "job-gpus-running", self._crawl_job_gpus_running),
            Asset("job-gpus-pending", "job-gpus-pending", self._crawl_job_gpus_pending),
            Asset(
                "job-gpus-completed",
                "job-gpus-completed",
                self._crawl_job_gpus_completed,
            ),
            Asset(
                "job-gpus-archived", "job-gpus-archived", self._crawl_job_gpus_archived
            ),
            Asset(
                "job-gpus-multi-nodes",
                "job-gpus-multi-nodes",
                self._crawl_job_gpus_multi_nodes,
            ),
            Asset("job-gpus-type", "job-gpus-type", self._crawl_job_gpus_type),
            Asset(
                "job-gpus-per-node",
                "job-gpus-per-node",
                self._crawl_job_gpus_per_node,
            ),
            Asset(
                "job-gpus-multi-types",
                "job-gpus-multi-types",
                self._crawl_job_gpus_multi_types,
            ),
            Asset(
                "job-gpus-per-socket",
                "job-gpus-per-socket",
                self._crawl_job_gpus_per_socket,
            ),
            Asset(
                "job-gpus-per-task",
                "job-gpus-per-task",
                self._crawl_job_gpus_per_task,
            ),
            Asset("job-gpus-gres", "job-gpus-gres", self._crawl_job_gpus_gres),
            Asset(
                "nodes",
                [
                    "nodes",
                    "jobs-node",
                    "node-planned",
                    "node-drain",
                    "node-idle",
                    "node-draining",
                    "node-mixed",
                    "node-allocated",
                    "node-down",
                ],
                self._crawl_nodes,
            ),
            Asset(
                "node-gpus-allocated",
                [
                    "node-with-gpus-model-allocated",
                    "node-with-gpus-allocated",
                ],
                self._crawl_node_gpus_allocated,
            ),
            Asset(
                "node-gpus-mixed",
                [
                    "node-with-gpus-model-mixed",
                    "node-with-gpus-mixed",
                ],
                self._crawl_node_gpus_mixed,
            ),
            Asset(
                "node-gpus-idle",
                [
                    "node-with-gpus-model-idle",
                    "node-with-gpus-idle",
                ],
                self._crawl_node_gpus_idle,
            ),
            Asset("node-without-gpu", "node-without-gpu", self._crawl_node_without_gpu),
            Asset("partitions", "partitions", self._crawl_partitions),
            Asset("qos", "qos", self._crawl_qos),
            Asset("reservations", "reservations", self._crawl_reservations),
            Asset("accounts", "accounts", self._crawl_accounts),
            Asset("racksdb", "racksdb-draw-coordinates", self._crawl_racksdb),
            Asset(
                "metrics",
                [
                    "metrics-memory-1h",
                    "metrics-memory-6h",
                    "metrics-memory-24h",
                    "metrics-cpu-1h",
                    "metrics-cpu-6h",
                    "metrics-cpu-24h",
                ],
                self._crawl_metrics,
            ),
            Asset("cache-stats", "cache-stats", self._crawl_cache_stats),
        }

        super().__init__(
            "gateway",
            asset_set,
            GatewayAssetsManager(),
            cluster,
            gateway_url(dev_tmp_dir),  # Get gateway HTTP base URL from configuration
            token,
        )

        self.cluster = cluster
        self.infrastructure = infrastructure
        self._cleanup_state = None

    def _crawl_clusters(self):
        self.dump_component_query("/api/clusters", "clusters")

    def _crawl_users(self):
        self.dump_component_query("/api/users", "users")

    def _crawl_login(self):
        self.dump_component_query(
            "/api/messages/login",
            {
                200: "message_login",
                404: "message_login_not_found",
                500: "message_login_error",
            },
        )

    def _crawl_ping(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/ping",
            "ping",
        )

    def _crawl_stats(self):
        self._cleanup_state = self.cluster.setup_for_stats()
        self.dump_component_query(f"/api/agents/{self.cluster.name}/stats", "stats")

    def _crawl_jobs(self):
        self._cleanup_state = self.cluster.setup_for_jobs()
        jobs = self.dump_component_query(
            f"/api/agents/{self.cluster.name}/jobs",
            "jobs",
            skip_exist=False,
            limit_dump=100,
        )

        if not len(jobs):
            logger.warning(
                "No jobs found in queue of cluster %s, unable to crawl jobs data",
                self.cluster,
            )
        else:
            min_job_id = jobs[0]["job_id"]

            def dump_job_state() -> None:
                if state in _job["job_state"]:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster.name}/job/{_job['job_id']}",
                        f"job-{state.lower()}",
                    )

            for _job in jobs:
                if _job["job_id"] < min_job_id:
                    min_job_id = _job["job_id"]
                for state in ["PENDING", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"]:
                    dump_job_state()

            self.dump_component_query(
                f"/api/agents/{self.cluster.name}/job/{min_job_id - 1}",
                "job-archived",
            )

        # FIXME: Download unknown job

    def _crawl_job_gpus_running(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-running", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_running(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-running",
        )

    def _crawl_job_gpus_pending(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-pending", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_pending(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-pending",
        )

    def _crawl_job_gpus_completed(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-completed", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_completed(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-completed",
        )

    def _crawl_job_gpus_archived(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-archived", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_archived(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-archived",
        )

    def _crawl_job_gpus_multi_nodes(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-multi-nodes",
                self.cluster.name,
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_multi_nodes(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-multi-nodes",
        )

    def _crawl_job_gpus_type(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-type", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_type(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_types"][0],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-type",
        )

    def _crawl_job_gpus_per_node(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-per-node", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_per_node(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-per-node",
        )

    def _crawl_job_gpus_multi_types(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-multi-types",
                self.cluster.name,
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_multi_types(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_types"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-multi-types",
        )

    def _crawl_job_gpus_per_socket(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-per-socket", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_per_socket(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-per-socket",
        )

    def _crawl_job_gpus_per_task(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-per-task", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_per_task(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-per-task",
        )

    def _crawl_job_gpus_gres(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-gres", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_gres(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/job/{job_id}",
            "job-gpus-gres",
        )

    def _crawl_nodes(self):
        self._cleanup_state = self.cluster.setup_for_nodes()
        nodes = self.dump_component_query(
            f"/api/agents/{self.cluster.name}/nodes",
            "nodes",
            skip_exist=False,
        )

        # Get jobs which have resources on any of the busy nodes
        try:
            random_busy_node = random.choice(list(filter(busy_node, nodes)))["name"]

            self.dump_component_query(
                f"/api/agents/{self.cluster.name}/jobs?node={random_busy_node}",
                "jobs-node",
            )
        except IndexError:
            logger.warning(
                "Unable to find busy node on gateway for cluster %s", self.cluster.name
            )

        # Download specific node
        for _node in nodes:
            if "IDLE" in _node["state"]:
                if "PLANNED" in _node["state"]:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                        "node-planned",
                    )
                elif "DRAIN" in _node["state"]:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                        "node-drain",
                    )
                else:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                        "node-idle",
                    )
            elif "DRAIN" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                    "node-draining",
                )
            if "MIXED" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                    "node-mixed",
                )
            if "ALLOCATED" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                    "node-allocated",
                )
            if "DOWN" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster.name}/node/{_node['name']}",
                    "node-down",
                )

        # FIXME: download unknown node

    def _crawl_node_gpus_allocated(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-allocated", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_node_gpus_allocated(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        response = self.get_component_response(
            f"/api/agents/{self.cluster.name}/node/{node}"
        )
        has_model = any(
            [len(gres.split(":")) > 2 for gres in response.json()["gres"].split(",")]
        )
        if has_model:
            asset = "node-with-gpus-model-allocated"
        else:
            asset = "node-with-gpus-allocated"
        self.dump_component_response(asset, response)

    def _crawl_node_gpus_mixed(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-mixed", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_node_gpus_mixed(
            self.cluster.gpu_info["gpu_partition"]
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        response = self.get_component_response(
            f"/api/agents/{self.cluster.name}/node/{node}"
        )
        has_model = any(
            [len(gres.split(":")) > 2 for gres in response.json()["gres"].split(",")]
        )
        if has_model:
            asset = "node-with-gpus-model-mixed"
        else:
            asset = "node-with-gpus-mixed"
        self.dump_component_response(asset, response)

    def _crawl_node_gpus_idle(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-idle", self.cluster.name
            )
            return
        node, job_id, user = self.cluster.setup_for_node_gpus_idle(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)], "gpu_node": node}
        response = self.get_component_response(
            f"/api/agents/{self.cluster.name}/node/{node}"
        )
        has_model = any(
            [len(gres.split(":")) > 2 for gres in response.json()["gres"].split(",")]
        )
        if has_model:
            asset = "node-with-gpus-model-idle"
        else:
            asset = "node-with-gpus-idle"
        self.dump_component_response(asset, response)

    def _crawl_node_without_gpu(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-without-gpu", self.cluster.name
            )
            return
        response = self.get_component_response(f"/api/agents/{self.cluster.name}/nodes")
        nodes = response.json()
        for _node in nodes:
            if not len(_node.get("gres", "")):
                node = _node["name"]
                break

        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/node/{node}",
            "node-without-gpu",
        )

    def _crawl_partitions(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/partitions",
            "partitions",
        )

    def _crawl_qos(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/qos",
            "qos",
        )

    def _crawl_reservations(self):
        self._cleanup_state = self.cluster.setup_for_reservations()
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/reservations",
            "reservations",
        )

    def _crawl_accounts(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/accounts",
            "accounts",
        )

    def _crawl_racksdb(self):
        # RacksDB infrastructure diagram
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/racksdb/draw/infrastructure/{self.infrastructure}.png?coordinates",
            "racksdb-draw-coordinates",
            method="POST",
            content={
                # FIXME: Retrieve these RacksDB request parameters from Slurm-web code
                # base to avoid duplication.
                "general": {"pixel_perfect": True},
                "dimensions": {"width": 1000, "height": 300},
                "infrastructure": {"equipment_labels": False, "ghost_unselected": True},
            },
        )

    def _crawl_metrics(self):
        # metrics
        for metric in ["nodes", "cores", "jobs", "cache"]:
            for _range in ["hour"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster.name}/metrics/{metric}?range={_range}",
                    f"metrics-{metric}-{_range}",
                    prettify=False,
                )

    def _crawl_cache_stats(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster.name}/cache/stats",
            "cache-stats",
        )
