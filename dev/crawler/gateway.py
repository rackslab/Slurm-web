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
import shlex
import random
import getpass
from pathlib import Path

import requests

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostClient

from .lib import (
    BaseAssetsManager,
    crawler_logger,
    load_settings,
    dump_component_query,
    busy_node,
)

ADMIN_PASSWORD_ENV_VAR = "SLURMWEB_DEV_ADMIN_PASSWORD"

logger = crawler_logger()


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

    _, stdout, _ = dev_host.exec(
        shlex.join(["firehpc", "status", "--cluster", cluster, "--json"])
    )
    cluster_status = json.loads(stdout.read())

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


class GatewayCrawler:
    def __init__(
        self, token: str, cluster: str, infrastructure: str, dev_tmp_dir: Path
    ):
        self.token = token
        self.cluster = cluster
        self.infrastructure = infrastructure
        # Get gateway HTTP base URL from configuration
        self.url = gateway_url(dev_tmp_dir)
        self.assets = GatewayAssetsManager()

    def dump_component_query(
        self,
        query: str,
        asset_name: dict[int, str] | str,
        headers: dict[str, str] | None = None,
        **kwargs,
    ):
        if headers is None:
            headers = {"Authorization": f"Bearer {self.token}"}
        return dump_component_query(
            self.assets.statuses,
            self.url,
            query,
            headers,
            self.assets.path,
            asset_name,
            **kwargs,
        )

    def crawl(self):
        """Crawl and save test assets from Slurm-web gateway component and return
        authentication JWT."""

        self.dump_component_query("/api/clusters", "clusters")
        self.dump_component_query("/api/users", "users")
        self.dump_component_query(
            "/api/messages/login",
            {
                200: "message_login",
                404: "message_login_not_found",
                500: "message_login_error",
            },
        )
        self.dump_component_query(f"/api/agents/{self.cluster}/stats", "stats")
        jobs = self.dump_component_query(
            f"/api/agents/{self.cluster}/jobs",
            "jobs",
            skip_exist=False,
            limit_dump=100,
        )

        if not (len(jobs)):
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

        def dump_node_state() -> None:
            if state in _node["state"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster}/node/{_node['name']}",
                    f"node-{state.lower()}",
                )

        # Download specific node
        for _node in nodes:
            for state in ["IDLE", "MIXED", "ALLOCATED", "DOWN", "DRAINING", "DRAINED"]:
                dump_node_state()

        # FIXME: download unknown node

        self.dump_component_query(
            f"/api/agents/{self.cluster}/partitions",
            "partitions",
        )
        self.dump_component_query(
            f"/api/agents/{self.cluster}/qos",
            "qos",
        )
        self.dump_component_query(
            f"/api/agents/{self.cluster}/reservations",
            "reservations",
        )
        self.dump_component_query(
            f"/api/agents/{self.cluster}/accounts",
            "accounts",
        )

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
        # metrics
        for metric in ["nodes", "cores", "jobs"]:
            for _range in ["hour"]:
                self.dump_component_query(
                    f"/api/agents/{self.cluster}/metrics/{metric}?range={_range}",
                    f"metrics-{metric}-{_range}",
                    prettify=False,
                )

        self.assets.save()
