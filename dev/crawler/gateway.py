#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

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
    BaseAssetsManager,
    TokenizedComponentCrawler,
    load_settings,
    busy_node,
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
        self, token: str, cluster: str, infrastructure: str, dev_tmp_dir: Path
    ):
        super().__init__(
            "gateway",
            {
                "clusters": self._crawl_clusters,
                "users": self._crawl_users,
                "login": self._crawl_login,
                "stats": self._crawl_stats,
                "jobs": self._crawl_jobs,
                "job-gpus-running": self._crawl_job_gpus_running,
                "job-gpus-pending": self._crawl_job_gpus_pending,
                "job-gpus-completed": self._crawl_job_gpus_completed,
                "job-gpus-archived": self._crawl_job_gpus_archived,
                "job-gpus-multi-nodes": self._crawl_job_gpus_multi_nodes,
                "job-gpus-type": self._crawl_job_gpus_type,
                "job-gpus-per-node": self._crawl_job_gpus_per_node,
                "job-gpus-multi-types": self._crawl_job_gpus_multi_types,
                "job-gpus-per-socket": self._crawl_job_gpus_per_socket,
                "job-gpus-per-task": self._crawl_job_gpus_per_task,
                "job-gpus-gres": self._crawl_job_gpus_gres,
                "nodes": self._crawl_nodes,
                "node-gpus-allocated": self._crawl_node_gpus_allocated,
                "node-gpus-mixed": self._crawl_node_gpus_mixed,
                "node-gpus-idle": self._crawl_node_gpus_idle,
                "node-without-gpu": self._crawl_node_without_gpu,
                "partitions": self._crawl_partitions,
                "qos": self._crawl_qos,
                "reservations": self._crawl_reservations,
                "accounts": self._crawl_accounts,
                "racksdb": self._crawl_racksdb,
                "metrics": self._crawl_metrics,
                "cache-stats": self._crawl_cache_stats,
            },
            GatewayAssetsManager(),
            gateway_url(dev_tmp_dir),  # Get gateway HTTP base URL from configuration
            token,
        )

        self.cluster = cluster
        self.infrastructure = infrastructure

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

    def _crawl_stats(self):
        self.dump_component_query(f"/api/agents/{self.cluster}/stats", "stats")

    def _crawl_jobs(self):
        jobs = self.dump_component_query(
            f"/api/agents/{self.cluster}/jobs",
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
                        f"/api/agents/{self.cluster}/job/{_job['job_id']}",
                        f"job-{state.lower()}",
                    )

            for _job in jobs:
                if _job["job_id"] < min_job_id:
                    min_job_id = _job["job_id"]
                for state in ["PENDING", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"]:
                    dump_job_state()

            self.dump_component_query(
                f"/api/agents/{self.cluster}/job/{min_job_id - 1}",
                "job-archived",
            )

        # FIXME: Download unknown job

    def _crawl_job_gpus_running(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-running",
        )

    def _crawl_job_gpus_pending(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-pending",
        )

    def _crawl_job_gpus_completed(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-completed",
        )

    def _crawl_job_gpus_archived(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-archived",
        )

    def _crawl_job_gpus_multi_nodes(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-multi-nodes",
        )

    def _crawl_job_gpus_type(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-type",
        )

    def _crawl_job_gpus_per_node(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-per-node",
        )

    def _crawl_job_gpus_multi_types(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-multi-types",
        )

    def _crawl_job_gpus_per_socket(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-per-socket",
        )

    def _crawl_job_gpus_per_task(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-per-task",
        )

    def _crawl_job_gpus_gres(self, job_id):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/job/{job_id}",
            "job-gpus-gres",
        )

    def _crawl_nodes(self):
        nodes = self.dump_component_query(
            f"/api/agents/{self.cluster}/nodes",
            "nodes",
            skip_exist=False,
        )

        # Get jobs which have resources on any of the busy nodes
        try:
            random_busy_node = random.choice(list(filter(busy_node, nodes)))["name"]

            self.dump_component_query(
                f"/api/agents/{self.cluster}/jobs?node={random_busy_node}",
                "jobs-node",
            )
        except IndexError:
            logger.warning(
                "Unable to find busy node on gateway for cluster %s", self.cluster
            )

        # Download specific node
        for _node in nodes:
            if "IDLE" in _node["state"]:
                if "PLANNED" in _node["state"]:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster}/node/{_node['name']}",
                        "node-planned",
                    )
                elif "DRAIN" in _node["state"]:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster}/node/{_node['name']}",
                        "node-drain",
                    )
                else:
                    self.dump_component_query(
                        f"/api/agents/{self.cluster}/node/{_node['name']}",
                        "node-idle",
                    )
            elif "DRAIN" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster}/node/{_node['name']}",
                    "node-draining",
                )
            if "MIXED" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster}/node/{_node['name']}",
                    "node-mixed",
                )
            if "ALLOCATED" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster}/node/{_node['name']}",
                    "node-allocated",
                )
            if "DOWN" in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster}/node/{_node['name']}",
                    "node-down",
                )

        # FIXME: download unknown node

    def _crawl_node_gpus_allocated(self, node):
        response = self.get_component_response(
            f"/api/agents/{self.cluster}/node/{node}"
        )
        print(response.json())
        has_model = any(
            [len(gres.split(":")) > 2 for gres in response.json()["gres"].split(",")]
        )
        if has_model:
            asset = "node-with-gpus-model-allocated"
        else:
            asset = "node-with-gpus-allocated"
        self.dump_component_response(asset, response)

    def _crawl_node_gpus_mixed(self, node):
        response = self.get_component_response(
            f"/api/agents/{self.cluster}/node/{node}"
        )
        print(response.json())
        has_model = any(
            [len(gres.split(":")) > 2 for gres in response.json()["gres"].split(",")]
        )
        if has_model:
            asset = "node-with-gpus-model-mixed"
        else:
            asset = "node-with-gpus-mixed"
        self.dump_component_response(asset, response)

    def _crawl_node_gpus_idle(self, node):
        response = self.get_component_response(
            f"/api/agents/{self.cluster}/node/{node}"
        )
        print(response.json())
        has_model = any(
            [len(gres.split(":")) > 2 for gres in response.json()["gres"].split(",")]
        )
        if has_model:
            asset = "node-with-gpus-model-idle"
        else:
            asset = "node-with-gpus-idle"
        self.dump_component_response(asset, response)

    def _crawl_node_without_gpu(self, node):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/node/{node}",
            "node-without-gpu",
        )

    def _crawl_partitions(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/partitions",
            "partitions",
        )

    def _crawl_qos(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/qos",
            "qos",
        )

    def _crawl_reservations(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/reservations",
            "reservations",
        )

    def _crawl_accounts(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/accounts",
            "accounts",
        )

    def _crawl_racksdb(self):
        # RacksDB infrastructure diagram
        self.dump_component_query(
            f"/api/agents/{self.cluster}/racksdb/draw/infrastructure/{self.infrastructure}.png?coordinates",
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
                    f"/api/agents/{self.cluster}/metrics/{metric}?range={_range}",
                    f"metrics-{metric}-{_range}",
                    prettify=False,
                )

    def _crawl_cache_stats(self):
        self.dump_component_query(
            f"/api/agents/{self.cluster}/cache/stats",
            "cache-stats",
        )
